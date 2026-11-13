/* Page controller for studio + Reception Externa; all stored data via RTDB transactions. */
(function(){'use strict';
 const C=window.JPExternalCore,DB=window.JPExternalRTDB,element=id=>document.getElementById(id);
 const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const role=document.body.dataset.jpExtRole;
 function connection(state){
  const dot=element('jpExtLogin');if(!dot||role!=='studio')return;
  dot.dataset.connection=state;
  const label={'connecting':'CONECTANDO AO FIREBASE','connected':'FIREBASE CONECTADO. CLIQUE PARA AUTENTICAR','offline':'FIREBASE DESCONECTADO. CLIQUE PARA AUTENTICAR'}[state]||'FIREBASE';
  dot.title=label;dot.setAttribute('aria-label',label);
 }
 const config=window.JP_EXT_FIREBASE_CONFIG;
 let store,months={},bankRecords={},bankListener=null,selected='',busy=false;
 const asBR=n=>Number(n)?new Date(Number(n)).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'AGUARDANDO CONFIRMAÇÃO';
 const show=(text,error=false)=>{const x=element('jpExtMessage');if(x){x.textContent=text;x.dataset.error=error?'true':'false';}};
 function operatorName(){
  const value=(element('jpExtOperator')?.value||'').trim();
  const person=window.firebase?.auth?.()?.currentUser;
  return (value||person?.displayName||person?.email||'').slice(0,100);
 }
 function active(){return C.flatten(months,true,C.nowDay()).sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'));}
 function allWinners(){const list=[];C.flatten(months).forEach(a=>a.winners.forEach(w=>list.push({...w,name:bankRecords['EXTERNA_'+w.id]?.name||'IDENTIFICAÇÃO PENDENTE',phone:bankRecords['EXTERNA_'+w.id]?.phone||'',action:a.title,prize:a.prize,month:a.distributionMonth,deliveryUnit:a.deliveryUnit})));
  return list.sort((a,b)=>Number(b.registeredAtMs||0)-Number(a.registeredAtMs||0));}
 function renderStudio(){const actions=active();const selectedAction=actions.find(a=>a.id===selected)||actions[0];selected=selectedAction?.id||'';
   const actionSearch=(element('jpExtActionSearch')?.value||'').toUpperCase();
   const list=element('jpExtActions');
   if(list)list.innerHTML=actions.filter(a=>(a.title+' '+a.prize).toUpperCase().includes(actionSearch)).map(a=>
    '<button class="jpExtActionTile '+(a.id===selected?'active':'')+'" type="button" data-action="'+esc(a.id)+'"><strong>'+esc(a.title)+'</strong><small>'+esc(a.prize)+'</small><small>'+esc(a.startsOn||'')+' — '+esc(a.endsOn||'')+'</small><span class="jpExtActionBalance">SALDO '+a.remaining/C.multiplier(a.deliveryUnit)+'</span></button>'
   ).join('')||'<div class="jpExtEmpty">NENHUMA AÇÃO ENCONTRADA.</div>';
   element('jpExtSelected').textContent=selectedAction?.title||'NENHUMA AÇÃO ATIVA';
   element('jpExtPrize').textContent=selectedAction?.prize||'—';
   if(element('jpExtPeriod'))element('jpExtPeriod').textContent=selectedAction?[selectedAction.startsOn,selectedAction.endsOn].filter(Boolean).join(' — '):'—';
   if(element('jpExtActionStatus'))element('jpExtActionStatus').textContent=selectedAction?'ATIVA':'AGUARDANDO';
   element('jpExtBalance').textContent=selectedAction?String(selectedAction.remaining/C.multiplier(selectedAction.deliveryUnit)):'0';
   element('jpExtUnit').textContent=selectedAction?.deliveryUnit==='pair'?'PARES':'UNIDADES';
   element('jpExtUsed').textContent=selectedAction?String(selectedAction.consumed/C.multiplier(selectedAction.deliveryUnit)):'0';
   element('jpExtAllocated').textContent=selectedAction?String(selectedAction.quantity):'0';
   element('jpExtSubmit').disabled=!selectedAction||!store||busy;
   const winnerSearch=(element('jpExtWinnerSearch')?.value||'').toUpperCase();
   const rows=(selectedAction?.winners||[]).filter(w=>(bankRecords['EXTERNA_'+w.id]?.name||'').toUpperCase().includes(winnerSearch))
      .sort((a,b)=>Number(b.registeredAtMs||0)-Number(a.registeredAtMs||0));
   const tb=element('jpExtWinners');
   if(tb)tb.innerHTML=rows.map(w=>
      '<tr><td><strong>'+esc(bankRecords['EXTERNA_'+w.id]?.name||'IDENTIFICAÇÃO PENDENTE')+'</strong></td><td>'+w.quantity+' '+(w.deliveryUnit==='pair'?'PAR':'IND.')+'</td><td>'+esc(asBR(w.registeredAtMs))+'</td><td>'+(w.bankStatus==='CONFIRMADO'?esc(w.status):'BANCO PENDENTE')+'</td></tr>'
   ).join('')||'<tr><td colspan="4" class="jpExtEmpty">NENHUM GANHADOR PARA ESTA BUSCA.</td></tr>';
 }
 function renderReception(){let winners=allWinners();const query=(element('jpExtSearch')?.value||'').toUpperCase();const status=element('jpExtStatusFilter')?.value||'PENDENTE';
   winners=winners.filter(w=>status==='TODOS'||(status==='PENDENTE'?w.status==='AGUARDANDO_RETIRADA':w.status===status));
   if(query)winners=winners.filter(w=>(w.name+' '+w.action+' '+w.prize).toUpperCase().includes(query));
   element('jpExtPending').textContent=String(allWinners().filter(w=>w.status==='AGUARDANDO_RETIRADA').length);
   element('jpExtDelivered').textContent=String(allWinners().filter(w=>w.status==='RETIRADO').length);
   element('jpExtReception').innerHTML=winners.map(w=>{
     const pending=w.bankStatus!=='CONFIRMADO';
     return `<tr><td><strong>${esc(w.name)}</strong><small>${esc(w.action)}</small></td><td>${esc(w.prize)}</td><td>${w.quantity} ${w.deliveryUnit==='pair'?'PAR':'IND.'}</td><td>${esc(asBR(w.registeredAtMs))}</td><td>${w.status==='RETIRADO'?`RETIRADO EM ${esc(asBR(w.deliveredAtMs))}`:pending?'AGUARDANDO BANCO CENTRAL':'AGUARDANDO RETIRADA'}</td><td>${w.status==='AGUARDANDO_RETIRADA'?(pending?`<button type="button" class="jpExtButton" data-sync="${esc(w.id)}">CONCILIAR</button>`:`<button type="button" class="jpExtButton" data-pickup="${esc(w.id)}">DAR BAIXA</button>`):'—'}</td></tr>`;
   }).join('')||'<tr><td colspan="6" class="jpExtEmpty">NENHUM REGISTRO PARA ESTE FILTRO.</td></tr>';
 }
 async function handleRegistration(ev){ev.preventDefault();if(busy)return;
   const action=active().find(a=>a.id===selected),name=element('jpExtWinnerName').value,phone=element('jpExtPhone').value;
   if(!action)return show('SELECIONE UMA AÇÃO ATIVA.',true);
   const operator=operatorName();if(!operator)return show('INFORME A IDENTIFICAÇÃO DO LOCUTOR.',true);
   busy=true;renderStudio();show('SALVANDO E VALIDANDO O GANHADOR NO FIREBASE...');
   try{
     const result=await store.registerWinner({month:action.distributionMonth,distributionId:action.distributionId,actionId:action.id,name,phone,quantity:1},operator);
     if(result.bankSynced){show('GANHADOR GRAVADO EM '+asBR(result.registeredAtMs)+' E ENVIADO À RECEPÇÃO.');}
     else{show('CADASTRO SALVO NO PRÊMIO, MAS O BANCO CENTRAL NÃO CONFIRMOU. A RECEPÇÃO BLOQUEARÁ A ENTREGA ATÉ A CONCILIAÇÃO. '+result.bankError,true);}
     element('jpExtWinnerName').value='';element('jpExtPhone').value='';
   }catch(error){show('CADASTRO NÃO CONFIRMADO: '+error.message,true);}
   finally{busy=false;renderStudio();}
 }
 async function handleReception(ev){const b=ev.target.closest('[data-pickup],[data-sync]');if(!b||busy)return;
   const winner=allWinners().find(w=>w.id===(b.dataset.pickup||b.dataset.sync));if(!winner)return;
   const operator=operatorName();if(!operator)return show('INFORME O RESPONSÁVEL PELA RECEPÇÃO.',true);
   const payload={month:winner.month,distributionId:winner.distributionId,actionId:winner.actionId,winnerId:winner.id};
   busy=true;show('CONFIRMANDO NO FIREBASE...');
   try{
     if(b.dataset.sync){await store.retryBankSync(payload);show('CADASTRO CONCILIADO COM O BANCO CENTRAL.');}
     else{
       if(!window.confirm('CONFIRMAR RETIRADA DE '+winner.name+'?\n\n'+winner.prize+' · '+winner.quantity+' '+(winner.deliveryUnit==='pair'?'PAR(ES)':'UNIDADE(S)'))){busy=false;show('BAIXA CANCELADA.');return;}
       const done=await store.pickup(payload,operator);
       show(done.bankPickupPending?'RETIRADA REGISTRADA, MAS O BANCO CENTRAL PRECISA DE CONCILIAÇÃO.':'RETIRADA SALVA E CONFERIDA EM '+asBR(done.deliveredAtMs),!!done.bankPickupPending);
     }
   }catch(err){show('OPERAÇÃO NÃO CONFIRMADA: '+err.message,true);}
   finally{busy=false;renderReception();}
 }
 function attachUI(){if(role==='studio'){
     element('jpExtActions').addEventListener('click',ev=>{const x=ev.target.closest('[data-action]');if(x){selected=x.dataset.action;renderStudio();}});
     element('jpExtWinnerForm').addEventListener('submit',handleRegistration);
     element('jpExtActionSearch')?.addEventListener('input',renderStudio);
     element('jpExtWinnerSearch')?.addEventListener('input',renderStudio);
   }else{
     element('jpExtSearch').addEventListener('input',renderReception);
     element('jpExtStatusFilter').addEventListener('change',renderReception);
     element('jpExtReception').addEventListener('click',handleReception);
   }
   element('jpExtLogin').addEventListener('click',async()=>{
     try{const provider=new window.firebase.auth.GoogleAuthProvider();await window.firebase.auth().signInWithPopup(provider);show('SESSÃO AUTENTICADA.');}
     catch(error){show('FALHA NA AUTENTICAÇÃO: '+error.message,true);}
   });
   const field=element('jpExtOperator');
   if(field){const saved=sessionStorage.getItem('jpExtOperator')||'';field.value=saved;
    field.addEventListener('input',e=>sessionStorage.setItem('jpExtOperator',e.target.value.slice(0,100)));}
 }
 function init(){attachUI();connection('connecting');if(!config){connection('offline');show('CONFIGURAÇÃO DO FIREBASE NÃO DISPONÍVEL.',true);return;}
   try{
     if(!window.firebase.apps.length)window.firebase.initializeApp(config);
     const app=window.firebase.app();
     window.firebase.database(app).ref('.info/connected').on('value',snap=>connection(snap.val()===true?'connected':'offline'),
      error=>{connection('offline');show('FALHA DE CONEXÃO: '+error.message,true);});
     store=new DB(window.firebase.database(app),{auth:window.firebase.auth(app),secureBankVerified:window.JP_EXT_SECURE_BANK_VERIFIED===true});
     store.onMonths(value=>{months=value;role==='studio'?renderStudio():renderReception();},e=>show('FALHA DE LEITURA NO FIREBASE: '+e.message,true));
     window.firebase.auth().onAuthStateChanged(user=>{
       element('jpExtAuthState').textContent=user?'CONECTADO: '+(user.email||user.uid):'NÃO AUTENTICADO — ENTRE COM CONTA AUTORIZADA';
       if(bankListener){bankListener.off('value');bankListener=null;}
       bankRecords={};
       if(user){
         bankListener=window.firebase.database().ref('jp-painel-brindes/winnerBank/records');
         bankListener.on('value',snap=>{
           bankRecords=snap.val()||{};
           role==='studio'?renderStudio():renderReception();
         },err=>show('BANCO DE GANHADORES NÃO ACESSÍVEL: '+err.message,true));
       }
       role==='studio'?renderStudio():renderReception();
     });
     role==='studio'?renderStudio():renderReception();
   }catch(err){connection('offline');show('FIREBASE INDISPONÍVEL: '+err.message,true);}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
