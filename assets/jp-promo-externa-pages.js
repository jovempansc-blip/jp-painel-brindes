/* Page controller for studio + Reception Externa; all stored data via RTDB transactions. */
(function(){'use strict';
 const C=window.JPExternalCore,DB=window.JPExternalRTDB,element=id=>document.getElementById(id);
 const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const role=document.body.dataset.jpExtRole;
 function connection(state){
  const dot=element('jpExtLogin');if(!dot||role!=='studio')return;
  dot.dataset.connection=state;
  const label={'connecting':'CONECTANDO AO FIREBASE','connected':'FIREBASE CONECTADO','offline':'FIREBASE DESCONECTADO'}[state]||'FIREBASE';
  dot.title=label;dot.setAttribute('aria-label',label);
 }
 const config=window.JP_EXT_FIREBASE_CONFIG;
 let store,months={},bankRecords={},bankListener=null,selected='',busy=false,editingCompanion=null;
 const asBR=n=>Number(n)?new Date(Number(n)).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'AGUARDANDO CONFIRMAÇÃO';
 const show=(text,error=false)=>{const x=element('jpExtMessage');if(x){x.textContent=text;x.dataset.error=error?'true':'false';}};
 function operatorName(){
  const value=(element('jpExtOperator')?.value||'').trim();
  const person=window.JP_EXT_PILOT_MODE===true?null:window.firebase?.auth?.()?.currentUser;
  return (value||person?.displayName||person?.email||'').slice(0,100);
 }
 function active(){return C.flatten(months,true,C.nowDay()).sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'));}
 function companionInfo(rec,isPair){
  if(!isPair)return '';
  const c=rec?.companion||null;
  if(!c?.name)return '<small class="jpExtWinnerPersonDetails">ACOMPANHANTE: A DEFINIR</small>';
  return '<small class="jpExtWinnerPersonDetails">ACOMPANHANTE: '+esc(c.name)+'</small>'+
    (c.phone?'<small class="jpExtWinnerPersonDetails">CONTATO: '+esc(c.phone)+'</small>':'')+
    (c.cpf?'<small class="jpExtWinnerPersonDetails">CPF DO ACOMPANHANTE: CADASTRADO</small>':'');
 }
 function clearCompanionFields(){['jpExtCompanionName','jpExtCompanionPhone','jpExtCompanionCpf'].forEach(id=>{if(element(id))element(id).value='';});}
 function allWinners(){const list=[];C.flatten(months).forEach(a=>a.winners.forEach(w=>list.push({...w,name:bankRecords['EXTERNA_'+w.id]?.name||'IDENTIFICAÇÃO PENDENTE',phone:bankRecords['EXTERNA_'+w.id]?.phone||'',companion:bankRecords['EXTERNA_'+w.id]?.companion||null,action:a.title,prize:a.prize,month:a.distributionMonth,deliveryUnit:a.deliveryUnit})));
  return list.sort((a,b)=>Number(b.registeredAtMs||0)-Number(a.registeredAtMs||0));}
 function beginCompanionEdit(id){
   const action=active().find(a=>a.id===selected);
   const winner=action?.winners.find(w=>w.id===id);
   if(!winner||winner.deliveryUnit!=='pair')return show('SELECIONE UM GANHADOR COM PAR DE INGRESSOS.',true);
   const rec=bankRecords['EXTERNA_'+id];
   if(!rec)return show('CONCILIE O BANCO DE GANHADORES ANTES DE EDITAR O ACOMPANHANTE.',true);
   editingCompanion={month:action.distributionMonth,distributionId:action.distributionId,actionId:action.id,winnerId:id,name:rec.name||''};
   element('jpExtCompanionName').value=rec.companion?.name||'';
   element('jpExtCompanionPhone').value=rec.companion?.phone||'';
   element('jpExtCompanionCpf').value=rec.companion?.cpf||'';
   renderStudio();
   element('jpExtCompanionFields')?.scrollIntoView?.({behavior:'smooth',block:'nearest'});
 }
 function cancelCompanionEdit(){
   editingCompanion=null;clearCompanionFields();renderStudio();
 }
 async function saveCompanionEdit(){
   if(!editingCompanion||busy||!store)return;
   busy=true;renderStudio();show('SALVANDO ACOMPANHANTE NO FIREBASE...');
   try{
    const companion=C.companionDetails({
      name:element('jpExtCompanionName').value,phone:element('jpExtCompanionPhone').value,cpf:element('jpExtCompanionCpf').value
    });
    const current=editingCompanion;
    const record=await store.updateCompanion({...current,companion},operatorName()||'PROMO EXTERNA · ESTÚDIO');
    bankRecords['EXTERNA_'+current.winnerId]=record;
    editingCompanion=null;clearCompanionFields();
    show('ACOMPANHANTE ATUALIZADO NO MESMO CADASTRO E DISPONÍVEL NA RECEPÇÃO.');
   }catch(error){show('ACOMPANHANTE NÃO SALVO: '+error.message,true);}
   finally{busy=false;renderStudio();}
 }
 function renderStudio(){const actions=active();const selectedAction=actions.find(a=>a.id===selected)||actions[0];selected=selectedAction?.id||'';
   const actionSearch=(element('jpExtActionSearch')?.value||'').toUpperCase();
   const list=element('jpExtActions');
   if(list)list.innerHTML=actions.filter(a=>(a.title+' '+a.prize).toUpperCase().includes(actionSearch)).map(a=>
    '<button class="jpExtActionTile '+(a.id===selected?'active':'')+'" type="button" data-action="'+esc(a.id)+'"><strong>'+esc(a.title)+'</strong><small>'+esc(a.prize)+'</small><small>'+esc(a.startsOn||'')+' — '+esc(a.endsOn||'')+'</small><span class="jpExtActionBalance">SALDO '+a.remaining/C.multiplier(a.deliveryUnit)+'</span></button>'
   ).join('')||'<div class="jpExtEmpty">NENHUMA AÇÃO ENCONTRADA.</div>';
   const companionFields=element('jpExtCompanionFields');
   if(companionFields)companionFields.hidden=selectedAction?.deliveryUnit!=='pair';
   if(element('jpExtCompanionEditorActions'))element('jpExtCompanionEditorActions').hidden=!editingCompanion;
   if(element('jpExtSaveCompanion'))element('jpExtSaveCompanion').disabled=busy;
   if(element('jpExtCompanionHint'))element('jpExtCompanionHint').textContent=editingCompanion?
     'EDITANDO ACOMPANHANTE DE '+editingCompanion.name+'. SALVAR NÃO DESCONTA NOVOS INGRESSOS.':
     'Preencha o acompanhante quando já estiver definido. O segundo ingresso faz parte do mesmo par e não consome nova cota.';
   element('jpExtSelected').textContent=selectedAction?.title||'NENHUMA AÇÃO ATIVA';
   element('jpExtPrize').textContent=selectedAction?.prize||'—';
   if(element('jpExtPeriod'))element('jpExtPeriod').textContent=selectedAction?[selectedAction.startsOn,selectedAction.endsOn].filter(Boolean).join(' — '):'—';
   if(element('jpExtActionStatus'))element('jpExtActionStatus').textContent=selectedAction?'ATIVA':'AGUARDANDO';
   element('jpExtBalance').textContent=selectedAction?String(selectedAction.remaining/C.multiplier(selectedAction.deliveryUnit)):'0';
   element('jpExtUnit').textContent=selectedAction?.deliveryUnit==='pair'?'PARES':'UNIDADES';
   element('jpExtUsed').textContent=selectedAction?String(selectedAction.consumed/C.multiplier(selectedAction.deliveryUnit)):'0';
   element('jpExtAllocated').textContent=selectedAction?String(selectedAction.quantity):'0';
   const protectedWritesAvailable=window.JP_EXT_PILOT_MODE===true||(window.JP_EXT_SECURE_BANK_VERIFIED===true&&!!window.firebase?.auth?.()?.currentUser?.uid);
   element('jpExtSubmit').disabled=!selectedAction||!store||busy||!protectedWritesAvailable||!!editingCompanion;
   element('jpExtSubmit').title=protectedWritesAvailable?'CADASTRAR GANHADOR · AMBIENTE PILOTO':'CADASTRO INDISPONÍVEL';
   const winnerSearch=(element('jpExtWinnerSearch')?.value||'').toUpperCase();
   const rows=(selectedAction?.winners||[]).filter(w=>[bankRecords['EXTERNA_'+w.id]?.name,bankRecords['EXTERNA_'+w.id]?.companion?.name].join(' ').toUpperCase().includes(winnerSearch))
      .sort((a,b)=>Number(b.registeredAtMs||0)-Number(a.registeredAtMs||0));
   const tb=element('jpExtWinners');
   if(tb)tb.innerHTML=rows.map(w=>{
     const person=bankRecords['EXTERNA_'+w.id]||{};
     const state=w.bankStatus==='CONFIRMADO'?w.status:'BANCO PENDENTE';
     const statusLabel=state==='AGUARDANDO_RETIRADA'?'AGUARDANDO RETIRADA':
       state==='RETIRADO'?'RETIRADO':state==='CANCELADO'?'CANCELADO':state;
     const statusClass=state==='RETIRADO'?'delivered':state==='AGUARDANDO_RETIRADA'?'pending':'attention';
     return '<tr class="jpExtWinnerRecord">'+
       '<td class="jpExtRecordIdentity"><strong>'+esc(person.name||'IDENTIFICAÇÃO PENDENTE')+'</strong>'+
         (person.phone?'<small class="jpExtRecordPersonContact">TEL. TITULAR: '+esc(person.phone)+'</small>':'')+
         companionInfo(person,w.deliveryUnit==='pair')+
         (w.deliveryUnit==='pair'&&w.status==='AGUARDANDO_RETIRADA'?
           '<button type="button" class="jpExtCompanionEditBtn" data-edit-companion="'+esc(w.id)+'">EDITAR ACOMPANHANTE</button>':'')+
       '</td>'+
       '<td class="jpExtRecordMetaCell jpExtRecordQty" data-label="PREMIAÇÃO"><strong>'+
         esc(w.quantity+' '+(w.deliveryUnit==='pair'?'PAR'+(Number(w.quantity)===1?'':'ES'):'UNIDADE'+(Number(w.quantity)===1?'':'S')))+
       '</strong></td>'+
       '<td class="jpExtRecordMetaCell jpExtRecordWhen" data-label="CADASTRADO"><time>'+esc(asBR(w.registeredAtMs))+'</time></td>'+
       '<td class="jpExtRecordMetaCell jpExtRecordStatus" data-label="SITUAÇÃO"><span class="jpExtRecordStatusPill '+statusClass+'">'+esc(statusLabel)+'</span></td>'+
     '</tr>';
   }).join('')||'<tr><td colspan="4" class="jpExtEmpty">NENHUM GANHADOR PARA ESTA BUSCA.</td></tr>';
 }
 function renderReception(){let winners=allWinners();const query=(element('jpExtSearch')?.value||'').toUpperCase();const status=element('jpExtStatusFilter')?.value||'PENDENTE';
   winners=winners.filter(w=>status==='TODOS'||(status==='PENDENTE'?w.status==='AGUARDANDO_RETIRADA':w.status===status));
   if(query)winners=winners.filter(w=>[w.name,w.companion?.name,w.action,w.prize].join(' ').toUpperCase().includes(query));
   element('jpExtPending').textContent=String(allWinners().filter(w=>w.status==='AGUARDANDO_RETIRADA').length);
   element('jpExtDelivered').textContent=String(allWinners().filter(w=>w.status==='RETIRADO').length);
   element('jpExtReception').innerHTML=winners.map(w=>{
     const pending=w.bankStatus!=='CONFIRMADO';
     return `<tr><td><strong>${esc(w.name)}</strong>${companionInfo(w,w.deliveryUnit==='pair')}<small>${esc(w.action)}</small></td><td>${esc(w.prize)}</td><td>${w.quantity} ${w.deliveryUnit==='pair'?'PAR':'IND.'}</td><td>${esc(asBR(w.registeredAtMs))}</td><td>${w.status==='RETIRADO'?`RETIRADO EM ${esc(asBR(w.deliveredAtMs))}`:pending?'AGUARDANDO BANCO CENTRAL':'AGUARDANDO RETIRADA'}</td><td>${w.status==='AGUARDANDO_RETIRADA'?(pending?`<button type="button" class="jpExtButton" data-sync="${esc(w.id)}">CONCILIAR</button>`:`<button type="button" class="jpExtButton" data-pickup="${esc(w.id)}">DAR BAIXA</button>`):'—'}</td></tr>`;
   }).join('')||'<tr><td colspan="6" class="jpExtEmpty">NENHUM REGISTRO PARA ESTE FILTRO.</td></tr>';
 }
 async function handleRegistration(ev){ev.preventDefault();if(busy||editingCompanion)return;
   const action=active().find(a=>a.id===selected),name=element('jpExtWinnerName').value,phone=element('jpExtPhone').value,cpf=C.cpfDigits(element('jpExtCpf')?.value||'');
   if(!action)return show('SELECIONE UMA AÇÃO ATIVA.',true);
   if(!C.cpfValid(element('jpExtCpf')?.value||''))return show('CPF INVÁLIDO. CORRIJA OS DÍGITOS OU DEIXE O CAMPO EM BRANCO.',true);
   // O link do estúdio identifica a origem; não exige nome individual do locutor.
   const operator=operatorName()||'PROMO EXTERNA · ESTÚDIO';
   busy=true;renderStudio();show('SALVANDO E VALIDANDO O GANHADOR NO FIREBASE...');
   try{
     const companion=action.deliveryUnit==='pair'?C.companionDetails({
       name:element('jpExtCompanionName')?.value||'',
       phone:element('jpExtCompanionPhone')?.value||'',
       cpf:element('jpExtCompanionCpf')?.value||''
     }):null;
     const result=await store.registerWinner({month:action.distributionMonth,distributionId:action.distributionId,actionId:action.id,name,phone,quantity:1,cpf,companion},operator);
     if(result.bankSynced){show('GANHADOR GRAVADO EM '+asBR(result.registeredAtMs)+' E ENVIADO À RECEPÇÃO.');}
     else{show('CADASTRO SALVO NO PRÊMIO, MAS O BANCO CENTRAL NÃO CONFIRMOU. A RECEPÇÃO BLOQUEARÁ A ENTREGA ATÉ A CONCILIAÇÃO. '+result.bankError,true);}
     element('jpExtWinnerName').value='';element('jpExtPhone').value='';if(element('jpExtCpf'))element('jpExtCpf').value='';clearCompanionFields();
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
     element('jpExtActions').addEventListener('click',ev=>{const x=ev.target.closest('[data-action]');if(x){if(selected!==x.dataset.action)cancelCompanionEdit();selected=x.dataset.action;renderStudio();}});
     element('jpExtWinnerForm').addEventListener('submit',handleRegistration);
     element('jpExtWinners')?.addEventListener('click',ev=>{
       const b=ev.target.closest('[data-edit-companion]');if(b&&!busy)beginCompanionEdit(b.dataset.editCompanion);
     });
     element('jpExtSaveCompanion')?.addEventListener('click',saveCompanionEdit);
     element('jpExtCancelCompanion')?.addEventListener('click',cancelCompanionEdit);
     ['jpExtCpf','jpExtCompanionCpf'].forEach(id=>element(id)?.addEventListener('input',e=>{
      const d=C.cpfDigits(e.target.value);
      e.target.value=d.slice(0,3)+(d.length>3?'.'+d.slice(3,6):'')+(d.length>6?'.'+d.slice(6,9):'')+(d.length>9?'-'+d.slice(9,11):'');
     }));
     element('jpExtActionSearch')?.addEventListener('input',renderStudio);
     element('jpExtWinnerSearch')?.addEventListener('input',renderStudio);
   }else{
     element('jpExtSearch').addEventListener('input',renderReception);
     element('jpExtStatusFilter').addEventListener('change',renderReception);
     element('jpExtReception').addEventListener('click',handleReception);
   }
   // A Promo Externa é de acesso direto, sem botão/diálogo de login.
   // O painel separado da Recepção Externa mantém o fluxo original.
   if(role!=='studio'&&window.JP_EXT_PILOT_MODE!==true)element('jpExtLogin')?.addEventListener('click',async()=>{
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
     store=new DB(window.firebase.database(app),{auth:window.JP_EXT_PILOT_MODE===true?null:window.firebase.auth(app),secureBankVerified:window.JP_EXT_SECURE_BANK_VERIFIED===true,pilotMode:window.JP_EXT_PILOT_MODE===true});
     store.onMonths(value=>{months=value;role==='studio'?renderStudio():renderReception();},e=>show('FALHA DE LEITURA NO FIREBASE: '+e.message,true));
     const onLogin=callback=>window.JP_EXT_PILOT_MODE===true?callback(null):window.firebase.auth(app).onAuthStateChanged(callback);
     onLogin(user=>{
       if(element('jpExtAuthState'))element('jpExtAuthState').textContent=window.JP_EXT_PILOT_MODE===true?'AMBIENTE PILOTO · DADOS FICTÍCIOS':(role==='studio'?(user?'FIREBASE CONECTADO; SESSÃO PREEXISTENTE':'CADASTRO NOMINAL PROTEGIDO'):(user?'CONECTADO: '+(user.email||user.uid):'NÃO AUTENTICADO'));
       if(bankListener){bankListener.off('value');bankListener=null;}
       bankRecords={};
       if(user||window.JP_EXT_PILOT_MODE===true){
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
