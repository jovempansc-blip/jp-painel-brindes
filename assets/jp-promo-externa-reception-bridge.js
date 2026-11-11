/* Embedded view for the existing JP Workspace Reception page (preview_recepcao.html).
 * Read-only unless Auth and independent A09 security release flag are both valid. */
(function(){'use strict';
 const C=window.JPExternalCore,Store=window.JPExternalRTDB;
 const host=document.getElementById('jpExternalReceptionRows');if(!host||!C||!Store)return;
 let months={},people={},db=null,engine=null;
 const safe=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 function stamp(ms){return Number(ms)?new Date(Number(ms)).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'AGUARDANDO SERVIDOR';}
 function render(){const all=[];
  C.flatten(months).forEach(a=>a.winners.forEach(w=>all.push({...w,action:a.title,prize:a.prize,month:a.distributionMonth})));
  all.sort((a,b)=>Number(b.registeredAtMs||0)-Number(a.registeredAtMs||0));
  const pending=all.filter(w=>w.status==='AGUARDANDO_RETIRADA');
  const count=document.getElementById('jpExternalReceptionCount');if(count)count.textContent=pending.length+' A RETIRAR';
  host.innerHTML=pending.length?pending.map(w=>{
   const p=people['EXTERNA_'+w.id],ready=w.bankStatus==='CONFIRMADO'&&!!p;
   return `<div class="receptionCampaign" style="margin:8px 0;padding:12px;display:grid;grid-template-columns:minmax(120px,1fr) minmax(115px,1fr) minmax(150px,1fr) auto;gap:10px;align-items:center"><strong>${safe(w.action)}<br><small>${safe(w.prize)}</small></strong><div>${safe(p?.name||'IDENTIFICAÇÃO PENDENTE')}<br><small>${safe(stamp(w.registeredAtMs))}</small></div><div>${w.quantity} ${w.deliveryUnit==='pair'?'PAR(ES)':'UNIDADE(S)'}<br><small>${ready?'AGUARDANDO RETIRADA':'AGUARDANDO BANCO CENTRAL'}</small></div>${ready?`<button class="pickupBtn" data-ext-pickup="${safe(w.id)}" type="button">DAR BAIXA</button>`:'<span class="badge">CONCILIAR BANCO</span>'}</div>`;
  }).join(''):'<div class="returnDrawerEmpty">NENHUM GANHADOR DE PROMO EXTERNA AGUARDANDO RETIRADA.</div>';
 }
 async function pickup(ev){const btn=ev.target.closest('[data-ext-pickup]');if(!btn||!engine)return;
   const matches=[];C.flatten(months).forEach(a=>a.winners.forEach(w=>{if(w.id===btn.dataset.extPickup)matches.push({...w,month:a.distributionMonth});}));
   const w=matches[0];if(!w)return;
   const operator=window.prompt('IDENTIFICAÇÃO DO ATENDENTE DA RECEPÇÃO:','');if(!operator?.trim())return;
   if(!window.confirm('CONFIRMAR ENTREGA DO PRÊMIO EXTERNO?'))return;
   btn.disabled=true;btn.textContent='CONFIRMANDO...';
   try{const result=await engine.pickup({month:w.month,distributionId:w.distributionId,actionId:w.actionId,winnerId:w.id},operator.trim());
     window.alert(result.bankPickupPending?'RETIRADA REGISTRADA. CONCILIAÇÃO DO BANCO CENTRAL PENDENTE.':'BAIXA DE RECEPÇÃO CONFIRMADA EM '+stamp(result.deliveredAtMs));}
   catch(error){window.alert('BAIXA NÃO CONFIRMADA: '+error.message);}
   finally{btn.disabled=false;render();}
 }
 host.addEventListener('click',pickup);
 function attach(){
   if(window.JP_EXT_SECURE_BANK_VERIFIED!==true){
     host.textContent='PROMO EXTERNA EM HOMOLOGAÇÃO · ACESSO AO BANCO DE GANHADORES AINDA NÃO VALIDADO PELO QA.';
     return true;
   }
   if(!window.firebase?.apps?.length)return false;
   const app=window.firebase.app();
   if(!window.firebase.auth(app).currentUser){host.textContent='ENTRE COM CONTA AUTORIZADA PARA VISUALIZAR OS GANHADORES EXTERNOS.';return false;}
   db=window.firebase.database(app);
   engine=new Store(db,{auth:window.firebase.auth(app),secureBankVerified:window.JP_EXT_SECURE_BANK_VERIFIED===true});
   engine.onMonths(value=>{months=value;render();},error=>{host.textContent='FALHA FIREBASE: '+error.message;});
   db.ref('jp-painel-brindes/winnerBank/records').on('value',s=>{people=s.val()||{};render();},error=>{host.textContent='BANCO DE GANHADORES INDISPONÍVEL: '+error.message;});
   return true;
 }
 // The legacy Reception controller initializes Firebase after a separate authentication loader.
 if(!attach()){
   let i=0;const timer=setInterval(()=>{if(attach()||++i>=30)clearInterval(timer);},300);
 }
})();
