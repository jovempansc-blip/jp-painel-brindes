/* JP Workspace | vínculos de eventos com promoções, somente metadados (sem CPF). */
(function(){
'use strict';
const C=window.JPPassportCore;
if(!C||typeof firebaseStateRootRef!=='function')return;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const encode=id=>Array.from(String(id||'')).map(ch=>ch.codePointAt(0).toString(16)).join('-');
const segments={reservado:'RESERVADO',ar:'RÁDIO',rs:'REDES SOCIAIS',app:'APP',rua:'EXTERNA',camarote:'CAMAROTE',camarim:'CAMARIM'};
let snapshot=null,current='',busy=false;
function rootRef(){const ref=firebaseStateRootRef();if(!ref)throw Error('FIREBASE NÃO ESTÁ CONECTADO.');return ref;}
function dialog(){
 let host=$('jpPassportLinkDialog');if(host)return host;
 host=document.createElement('div');host.id='jpPassportLinkDialog';host.className='jpPassportBackdrop';host.hidden=true;
 host.innerHTML='<section class="jpPassportDialog" role="dialog" aria-modal="true" aria-labelledby="jpPassportDialogTitle">'+
 '<div class="jpPassportDialogHead"><div><span class="jpPassportEyebrow">PROMOÇÃO · VÍNCULOS</span><h3 id="jpPassportDialogTitle">EVENTOS DO PASSAPORTE</h3></div><button type="button" class="jpPassportSmallBtn" data-passport-close>FECHAR</button></div>'+
 '<p class="jpPassportHint">Vincule eventos já cadastrados na Distribuição Geral. A operação compromete a cota do segmento escolhido, sem descontar ingressos duas vezes.</p>'+
 '<div class="jpPassportForm">'+
 '<label class="jpPassportField jpPassportEvent"><span>EVENTO / COMPETÊNCIA</span><select id="jpPassportEvent"></select></label>'+
 '<label class="jpPassportField"><span>SEGMENTO DE ORIGEM</span><select id="jpPassportSegment">'+Object.entries(segments).map(([key,label])=>'<option value="'+key+'">'+label+'</option>').join('')+'</select></label>'+
 '<label class="jpPassportField"><span>INGRESSOS / GANHADOR</span><input type="number" id="jpPassportRights" min="1" max="12" step="1" value="2"></label>'+
 '<label class="jpPassportField"><span>QTD. EM UNIDADES</span><input type="number" id="jpPassportUnits" min="1" step="1" value="2"></label>'+
 '<label class="jpPassportField jpPassportReservation"><span>RESERVA ESPECÍFICA</span><select id="jpPassportReservation"></select></label>'+
 '<div class="jpPassportActions"><button type="button" class="jpPassportAdd" id="jpPassportAddEvent">+ VINCULAR EVENTO</button></div>'+
 '</div><p class="jpPassportHint" id="jpPassportStock"></p><div id="jpPassportStatus" role="status" aria-live="polite"></div>'+
 '<div class="jpPassportListTitle">EVENTOS VINCULADOS À PROMOÇÃO</div><div id="jpPassportLinkedList"></div>'+
 '</section>';
 document.body.appendChild(host);
 host.addEventListener('click',e=>{if(e.target===host||e.target.closest('[data-passport-close]'))close();});
 return host;
}
function info(message,isError=false){
 const target=$('jpPassportStatus');if(target){target.textContent=message;target.dataset.error=isError?'true':'false';}
}
function pickPromo(){return C.lookupPromo(snapshot?.months,current)?.p||null;}
function cfg(){return Object.values(snapshot?.passportCampaigns||{}).find(x=>x?.promoId===current)||null;}
function inventory(){
 const entries=[];
 for(const [month,m] of Object.entries(snapshot?.months||{})){
  for(const d of C.list(m?.distributions)){
   if(!d?.id||(d.prizeType!=='ingresso'&&d.ticketMode!=='ingresso'&&d.isTicket!==true))continue;
   const eventDate=d.eventDate||d.startDate||d.date||'';
   entries.push({month,id:d.id,d,eventDate,key:C.capKey(month,d.id)});
  }
 }
 return entries.sort((a,b)=>String(a.eventDate).localeCompare(String(b.eventDate)));
}
function linked(){return C.list(cfg()?.events);}
function refreshInventory(){
 const select=$('jpPassportEvent'),linkedSet=new Set(linked().map(x=>C.capKey(x.monthKey,x.distributionId)));
 const options=inventory().filter(v=>!linkedSet.has(v.key)),selected=select?.value;
 if(!select)return;
 select.innerHTML=options.map(x=>'<option value="'+esc(x.key)+'">'+esc(x.d.eventGroupName||x.d.show||x.d.prize||'SHOW')+' · '+esc(x.d.eventVersionTitle||x.d.title||x.d.prize||'INGRESSO')+' · '+esc(x.eventDate)+' · '+esc(x.month)+'</option>').join('');
 if(options.some(x=>x.key===selected))select.value=selected;
 if(!options.length)select.innerHTML='<option value="">TODOS OS EVENTOS DISPONÍVEIS JÁ VINCULADOS</option>';
 const old=cfg();if(old?.events?.length){$('jpPassportRights').value=String(old.rights||2);$('jpPassportRights').disabled=true;}
 else $('jpPassportRights').disabled=false;
 updateStock();
}
function updateStock(){
 const e=inventory().find(x=>x.key===$('jpPassportEvent')?.value),segment=$('jpPassportSegment')?.value;
 const box=$('jpPassportStock'),reserve=$('jpPassportReservation'),row=document.querySelector('#jpPassportLinkDialog .jpPassportReservation');
 if(!box||!reserve||!row)return;
 row.hidden=segment!=='reservado';
 const currentId=reserve.value,rows=segment==='reservado'&&e?C.reservations(e.d):[];
 reserve.innerHTML=rows.map(r=>'<option value="'+esc(r.id)+'">'+esc(r.label)+' · '+r.units+' UNID.</option>').join('');
 if(rows.some(r=>r.id===currentId))reserve.value=currentId;
 if(!e){box.textContent='NÃO HÁ EVENTO DISPONÍVEL PARA ESTE FILTRO.';return;}
 const total=C.capacity(e.d,segment),claimed=C.commitments(snapshot,e.month,e.id,segment);
 const chosen=rows.find(r=>r.id===reserve.value);
 const committedReserve=chosen?C.commitments(snapshot,e.month,e.id,segment,chosen.id):0;
 box.textContent='SEGMENTO: '+total+' UNIDADES FÍSICAS · VINCULADAS: '+claimed+' · LIVRES: '+Math.max(0,total-claimed)+
  (chosen?' · RESERVA '+chosen.label+': '+Math.max(0,chosen.units-committedReserve)+' LIVRES':'');
}
function refreshLinked(){
 const list=$('jpPassportLinkedList');if(!list)return;
 const rows=linked();
 list.innerHTML=rows.map(link=>{
  const d=inventory().find(x=>x.month===link.monthKey&&x.id===link.distributionId);
  return '<div class="jpPassportLinkedRow"><div><strong>'+esc(d?.d.eventGroupName||d?.d.show||d?.d.prize||link.distributionId)+'</strong>'+
   '<span>'+esc(link.date||d?.eventDate||'')+' · '+esc(link.monthKey)+' · '+esc(segments[link.segment]||link.segment)+
   (link.reservationId?' · RESERVA '+esc(link.reservationId):'')+'</span></div><strong>'+Number(link.units||0)+' UNID.</strong>'+
   '<button type="button" class="jpPassportSmallBtn" data-passport-unlink="'+esc(link.id)+'">DESVINCULAR</button></div>';
 }).join('')||'<div class="jpPassportEmpty">NENHUM EVENTO VINCULADO. SELECIONE O PRIMEIRO SHOW ACIMA.</div>';
 const chip=$('jpPromoPassportSummary');if(chip)chip.textContent=rows.length+' EVENTO(S) VINCULADO(S)';
}
function refresh(){refreshInventory();refreshLinked();}
async function fetchState(){
 const snap=await rootRef().once('value');const data=snap?.val?.();
 if(!data?.months)throw Error('NÃO FOI POSSÍVEL CONSULTAR A DISTRIBUIÇÃO NO FIREBASE.');
 snapshot=data;return data;
}
async function open(promoId=''){
 if(busy)return;
 const id=promoId||$('promoId')?.value?.trim();
 if(!id){alert('SALVE A PROMOÇÃO PRIMEIRO. DEPOIS ABRA A FICHA E VINCULE OS SHOWS.');return;}
 current=id;dialog().hidden=false;
 info('CONSULTANDO PROMOÇÕES E ESTOQUE NO FIREBASE...');
 try{
  await fetchState();
  if(!pickPromo())throw Error('PROMOÇÃO AINDA NÃO ENCONTRADA NO FIREBASE. CONFIRME O SALVAMENTO ANTES DE VINCULAR.');
  $('jpPassportDialogTitle').textContent='EVENTOS · '+(pickPromo().name||pickPromo().title||'PROMOÇÃO');
  refresh();info('ESCOLHA O PRÊMIO, O SEGMENTO E A RESERVA DE ORIGEM.');
 }catch(error){info(error.message,true);$('jpPassportEvent').innerHTML='';}
}
function close(){const h=$('jpPassportLinkDialog');if(h)h.hidden=true;current='';snapshot=null;}
function operator(){return 'JP WORKSPACE · PROMOÇÕES';}
async function add(){
 if(busy)return;busy=true;
 const btn=$('jpPassportAddEvent');if(btn)btn.disabled=true;
 let failure='';
 try{
  const e=inventory().find(x=>x.key===$('jpPassportEvent')?.value);
  if(!e)throw Error('SELECIONE UM EVENTO DA DISTRIBUIÇÃO.');
  const segment=$('jpPassportSegment').value,reservationId=segment==='reservado'?$('jpPassportReservation').value:'',
   units=Number($('jpPassportUnits').value),rights=Number($('jpPassportRights').value);
  const promoId=current,key=encode(promoId),now=new Date().toISOString();
  info('CONFERINDO SALDO E SALVANDO O VÍNCULO...');
  const outcome=await rootRef().transaction(data=>{
   failure='';const valid=C.validateLink(data,{promoId,monthKey:e.month,distributionId:e.id,segment,reservationId,units,rights});
   if(!valid.ok){failure=valid.reason;return;}
   const config=data.passportCampaigns||{},old=config[key]||{},events=C.list(old.events);
   if(events.some(x=>x.monthKey===e.month&&x.distributionId===e.id)){failure='EVENTO JÁ VINCULADO.';return;}
   data.passportCampaigns={...config,[key]:{...old,promoId,mode:'PASSAPORTE_MULTIEVENTOS',
    rights:events.length?old.rights:rights,allowTransfer:!!old.allowTransfer,
    events:[...events,{id:e.key,monthKey:e.month,distributionId:e.id,date:e.eventDate,
     segment,reservationId,units,linkedAt:now,linkedBy:operator()}],updatedAt:now}};
   data.passportAudit=[...C.list(data.passportAudit),{kind:'LINK',promoId,monthKey:e.month,distributionId:e.id,segment,reservationId,units,at:now}].slice(-1800);
   return data;
  },undefined,false);
  if(!outcome?.committed)throw Error(failure||'O FIREBASE NÃO CONFIRMOU O VÍNCULO.');
  await fetchState();
  if(!linked().some(x=>x.id===e.key))throw Error('GRAVAÇÃO NÃO CONFERIDA. CONSULTE A LISTA ANTES DE REPETIR.');
  refresh();info('EVENTO VINCULADO E CONFERIDO. A RESERVA FÍSICA NÃO FOI DESCONTADA NOVAMENTE.');
 }catch(error){info(error.message,true);}finally{busy=false;if(btn)btn.disabled=false;}
}
async function unlink(key){
 if(busy)return;busy=true;
 try{
  const id=current,p=pickPromo();if(!p)throw Error('PROMOÇÃO NÃO LOCALIZADA.');
  if(C.winnerRows(p).length)throw Error('DESVINCULAÇÃO BLOQUEADA: PROMOÇÃO JÁ TEM GANHADOR.');
  if(!confirm('DESVINCULAR ESTE EVENTO? O HISTÓRICO DO SORTEIO NÃO SERÁ ALTERADO.'))return;
  let reason='';const now=new Date().toISOString(),ref=encode(id);
  const tx=await rootRef().transaction(data=>{
   reason='';const config=data?.passportCampaigns?.[ref];
   if(!config){reason='VÍNCULO NÃO LOCALIZADO.';return;}
   const rows=C.list(config.events),target=rows.find(x=>x.id===key);
   if(!target){reason='EVENTO JÁ DESVINCULADO.';return;}
   const stored=C.lookupPromo(data.months,id)?.p;
   if(!stored||C.winnerRows(stored).length){reason='RESULTADO JÁ CONFIRMADO. DESVINCULAÇÃO BLOQUEADA.';return;}
   data.passportCampaigns[ref]={...config,events:rows.filter(x=>x.id!==key),updatedAt:now};
   data.passportAudit=[...C.list(data.passportAudit),{kind:'UNLINK',promoId:id,linkId:key,at:now}].slice(-1800);
   return data;
  },undefined,false);
  if(!tx?.committed)throw Error(reason||'DESVINCULAÇÃO NÃO CONFIRMADA.');
  await fetchState();refresh();info('EVENTO DESVINCULADO.');
 }catch(e){info(e.message,true);}finally{busy=false;}
}
document.addEventListener('click',e=>{
 if(e.target.closest('#jpPromoLinkEventsBtn')){e.preventDefault();open();return;}
 const cardBtn=e.target.closest('[data-jp-passport-promo]');
 if(cardBtn){e.preventDefault();open(cardBtn.dataset.jpPassportPromo);return;}
 const unlinkBtn=e.target.closest('[data-passport-unlink]');
 if(unlinkBtn){e.preventDefault();unlink(unlinkBtn.dataset.passportUnlink);return;}
 if(e.target.closest('#jpPassportAddEvent')){e.preventDefault();add();}
});
document.addEventListener('change',e=>{
 if(e.target.closest('#jpPassportLinkDialog')&&['jpPassportEvent','jpPassportSegment','jpPassportReservation'].includes(e.target.id))updateStock();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
window.JPLinkEvents={open,close,refresh,validate:C.validateLink};
})();

