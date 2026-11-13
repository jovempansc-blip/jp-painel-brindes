(function(){
'use strict';
const C=window.JPPassportCore;
if(!C||typeof firebaseRef==='undefined'||typeof receptionAllPromos!=='function')return;
const el=id=>document.getElementById(id), esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=x=>String(x??'').trim(), list=C.list;
const db=()=>receptionDatabase, root=()=>firebaseRef;
const user=()=>window.firebase?.auth?.()?.currentUser||null;
const promoTitle=p=>String(p?.name||p?.title||p?.prizeTitle||'PROMOÇÃO');
const dateText=x=>typeof formatBR==='function'?formatBR(x):x;
const encode=x=>Array.from(String(x||'')).map(ch=>ch.codePointAt(0).toString(16)).join('-');
const privatePath='jp-painel-brindes/passportPrivate';
const enabledMeta=()=>window.JP_PASSPORT_METADATA_RULES_HOMOLOGATED===true;
const enabledPrivate=()=>window.JP_PASSPORT_PRIVATE_RULES_HOMOLOGATED===true;
const note=(s,bad=false)=>typeof showReceptionToast==='function'?showReceptionToast(s,bad):window.alert(s);
let pins={},passports={},tab='ativas',year=new Date().getFullYear(),selected='',menuId='',busy=false,privateAllowed=false,privateData={},privateId='',privateListener=null;
async function identity(){
 const u=user();if(!u)throw Error('LOGIN AUTENTICADO É OBRIGATÓRIO.');
 const token=await u.getIdTokenResult(true),claims=token?.claims||{};
 if(claims.jpReception!==true&&claims.jpAdmin!==true)throw Error('PERMISSÃO DA RECEPÇÃO NÃO HOMOLOGADA PARA ESTA OPERAÇÃO.');
 return {uid:u.uid,sector:'RECEPÇÃO'};
}
const promos=()=>receptionAllPromos().filter(receptionCampaignVisible);
const getPromo=id=>promos().find(p=>p.id===id)||null;
const isPinned=id=>!!pins[encode(id)]?.pinned;
const config=id=>passports[encode(id)]||null;
const winners=p=>C.winnerRows(p);
function closeMenu(){const x=el('jpRcpMenu');if(x)x.hidden=true;}
function menu(id,x,y){
 const host=el('jpRcpMenu');if(!host||!getPromo(id))return;menuId=id;
 host.innerHTML='<button type="button" data-jp-action="pin">'+(isPinned(id)?'DESAFIXAR':'FIXAR NO PAINEL')+'</button>'
  +'<button type="button" data-jp-action="open">ABRIR FICHA</button>'
  +'<button type="button" data-jp-action="history">VER NO HISTÓRICO</button>'
  +'<button type="button" data-jp-action="passport">CONFIGURAR PASSAPORTE</button>';
 host.style.left=Math.max(6,Math.min(x,innerWidth-186))+'px';
 host.style.top=Math.max(6,Math.min(y,innerHeight-164))+'px';host.hidden=false;
}
function updateTabs(){
 document.querySelectorAll('#jpRcpTabs [data-jp-tab]').forEach(x=>x.setAttribute('aria-selected',String(x.dataset.jpTab===tab)));
 const y=el('jpRcpYear');if(y)y.hidden=tab!=='historico';
}
function activate(next){
 if(!['ativas','fixadas','historico','passaportes'].includes(next))return;
 tab=next;updateTabs();render();
}
function yearOf(p){return String(p.startDate||p.drawDate||p.resultDate||p.createdAt||'').slice(0,4);}
function row(p){
 const id=esc(p.id),names=winners(p).map(w=>w.name).join(' · ');
 const dates=[p.startDate||p.drawDate||p.resultDate,p.endDate].filter(Boolean).map(dateText).join(' — ');
 const events=list(config(p.id)?.events);
 return '<div class="jpRcpResultRow" data-jp-promo="'+id+'">'
  +'<div><strong>'+esc(promoTitle(p))+'</strong><small>'+esc(dates)+'</small></div>'
  +'<div class="jpRcpMid"><span class="jpRcpTag '+(isPinned(p.id)?'pin':'')+'">'+(isPinned(p.id)?'FIXADA':'CAMPANHA')+'</span><small>'+events.length+' EVENTO(S) VINCULADO(S)</small></div>'
  +'<div class="jpRcpMid"><strong>'+esc(names||'RESULTADO PENDENTE')+'</strong></div>'
  +'<div class="jpRcpActions"><button class="jpRcpBtn" data-jp-open="'+id+'">ABRIR</button><button class="jpRcpBtn" data-jp-menu="'+id+'" aria-label="Opções">⋮</button></div>'
  +'<div data-jp-result="'+id+'" hidden></div></div>';
}
function alternative(){
 if(tab==='ativas'){const labels=el('receptionCampaignLabels');if(labels)labels.hidden=false;return false;}
 const area=el('receptionCampaignList'),counter=el('receptionCampaignCount'),labels=el('receptionCampaignLabels');
 if(!area||!counter)return false;
 if(labels)labels.hidden=true;
 let data=promos();
 if(tab==='fixadas')data=data.filter(p=>isPinned(p.id));
 if(tab==='historico')data=data.filter(p=>yearOf(p)===String(year));
 if(tab==='passaportes')data=data.filter(p=>p.id);
 const search=safe(el('searchFilter')?.value).toUpperCase();
 data=data.filter(p=>(promoTitle(p)+' '+winners(p).map(w=>w.name).join(' ')).toUpperCase().includes(search));
 data.sort((a,b)=>String(b.startDate||b.drawDate||'').localeCompare(String(a.startDate||a.drawDate||'')));
 counter.textContent=data.length+' CAMPANHA'+(data.length===1?'':'S');
 area.innerHTML=data.length?data.map(row).join(''):'<div class="jpRcpEmpty">NENHUMA PROMOÇÃO ENCONTRADA.</div>';
 return true;
}
function active(rows){
 const original=receptionActiveCampaigns(todayISO(),rows),ids=new Set(original.map(x=>x.p.id));
 return [...promos().filter(p=>isPinned(p.id)&&!ids.has(p.id)).map(p=>receptionCampaignState(p,rows,todayISO())),...original];
}
function rerender(){
 const rows=typeof allResultRows==='function'?allResultRows():[];
 renderReceptionCampaigns(rows);if(selected)renderEditor();
}
async function pin(id){
 if(busy)return;busy=true;
 try{
  await ensureReceptionOnline();const op=await identity(),wanted=!isPinned(id),stamp=new Date().toISOString();
  const ref=root().child('receptionCampaignPins').child(encode(id));
  const operationId='PIN_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);
  const tx=await ref.transaction(old=>{
   if(!!old?.pinned===wanted)return;
   const history=list(old?.history);
   if(history.some(row=>row.id===operationId))return;
   return {pinned:wanted,promoId:id,updatedBy:op.uid,updatedAt:stamp,
    history:[...history,{id:operationId,action:wanted?'PIN':'UNPIN',uid:op.uid,at:stamp}].slice(-150)};
  },undefined,false);
  if(!tx?.committed)throw Error('NÃO FOI POSSÍVEL CONFIRMAR A FIXAÇÃO.');
  const value=(await ref.get()).val();if(!!value?.pinned!==wanted)throw Error('A FIXAÇÃO NÃO CONFERIU NA LEITURA REMOTA.');
  note(wanted?'PROMOÇÃO FIXADA EM TODAS AS ESTAÇÕES.':'PROMOÇÃO DESAFIXADA.');
 }catch(e){note(e.message,true);}finally{busy=false;}
}
function inventory(){
 const items=[];
 for(const [month,m] of Object.entries(state.months||{}))for(const d of list(m?.distributions)){
  if(!d?.id||(d.prizeType!=='ingresso'&&d.ticketMode!=='ingresso'&&d.isTicket!==true))continue;
  items.push({month,d,id:C.capKey(month,d.id),name:d.title||d.show||d.prize||'INGRESSO',date:d.eventDate||d.date||d.startDate||''});
 }
 const seen=new Set();
 return items.filter(e=>{if(seen.has(e.id))return false;seen.add(e.id);return true;})
  .sort((a,b)=>String(a.date).localeCompare(String(b.date))||a.name.localeCompare(b.name,'pt-BR'));
}
function eventSelectHtml(cfg){
 const current=list(cfg?.events),free=inventory().filter(e=>!current.some(c=>c.monthKey===e.month&&c.distributionId===e.d.id));
 return '<select id="jpRcpSelectEvent">'+free.map(e=>'<option value="'+esc(e.id)+'">'+esc(e.name)+' · '+esc(dateText(e.date))+' · '+esc(e.month)+'</option>').join('')+'</select>';
}
function refreshReservation(){
 const key=el('jpRcpSelectEvent')?.value,segment=el('jpRcpSegment')?.value||'reservado';
 const entry=inventory().find(e=>e.id===key),box=el('jpRcpReservationBlock'),sel=el('jpRcpReservation');
 if(!entry||!box||!sel)return;
 box.hidden=segment!=='reservado';
 const rows=segment==='reservado'?C.reservations(entry.d):[];
 const prev=sel.value;
 sel.innerHTML=rows.map(r=>'<option value="'+esc(r.id)+'">'+esc(r.label)+' · '+r.units+' UNID.</option>').join('');
 if(rows.some(r=>r.id===prev))sel.value=prev;
 const total=C.capacity(entry.d,segment),used=C.commitments({passportCampaigns:passports},entry.month,entry.d.id,segment);
 const hint=el('jpRcpStockHint');
 if(hint)hint.textContent='SEGMENTO: '+total+' UNID. · COMPROMETIDAS: '+used+' · LIVRES: '+Math.max(0,total-used)+' UNID.';
}
function eventLine(link){
 const item=inventory().find(e=>e.month===link.monthKey&&e.d.id===link.distributionId);
 return '<div class="jpRcpEventLine"><div><strong>'+esc(item?.name||link.distributionId)+'</strong><small class="jpRcpSmall">'+esc(dateText(item?.date||link.date))+'</small></div>'
  +'<span class="jpRcpTag">'+esc(C.segments[link.segment])+'</span><strong>'+Number(link.units)+' UNID.</strong>'
  +'<button class="jpRcpBtn" data-jp-unlink="'+esc(C.capKey(link.monthKey,link.distributionId))+'" '+(!enabledMeta()||winners(getPromo(selected)).length?'disabled':'')+'>DESVINCULAR</button></div>';
}
const maskCpf=v=>String(v||'').replace(/\D/g,'').length===11?'***.***.***-'+String(v).replace(/\D/g,'').slice(-2):'';
function seatKey(link,w,index){return encode([selected,link.monthKey,link.distributionId,w.id,index].join('|'));}
function nominal(cfg){
 const ww=winners(getPromo(selected)),links=list(cfg.events),rights=Number(cfg.rights)||2;
 if(!ww.length)return '<div class="jpRcpWarning">REGISTRE O GANHADOR OFICIAL DA PROMOÇÃO NO ESTÚDIO ANTES DE INDICAR DESTINATÁRIOS.</div>';
 if(ww.some(w=>!w.id))return '<div class="jpRcpWarning">RESULTADO LEGADO SEM IDENTIFICADOR INDIVIDUAL. É NECESSÁRIO CONCILIAR ANTES DO CADASTRO.</div>';
 let html='<div class="jpRcpPanelTitle" style="margin-top:14px"><h3>CONTROLE NOMINAL POR EVENTO</h3></div>';
 if(!privateAllowed)html+='<div class="jpRcpWarning">CPFs E TRANSFERÊNCIAS BLOQUEADOS. EXIGE LOGIN, REGRAS PRIVADAS NO FIREBASE E HOMOLOGAÇÃO DE SEGURANÇA.</div>';
 for(const link of links){
  const item=inventory().find(x=>x.month===link.monthKey&&x.d.id===link.distributionId);
  html+='<div class="jpRcpEvent"><h4>'+esc(item?.name||link.distributionId)+' · '+esc(dateText(item?.date||link.date))+'</h4>';
  for(const w of ww){
   html+='<p class="jpRcpSmall">GANHADOR PRINCIPAL: <strong>'+esc(w.name)+'</strong></p>';
   for(let seat=1;seat<=rights;seat++){
    const key=seatKey(link,w,seat),record=privateAllowed?privateData.tickets?.[key]||{}:{},fixed=record.status==='UTILIZADO',disabled=!privateAllowed||fixed;
    html+='<div class="jpRcpBeneficiary" data-jp-seat="'+esc(key)+'">'
      +'<span class="jpRcpLabel jpRcpTag">ING. '+seat+'</span>'
      +'<div class="jpRcpField"><label>NOME COMPLETO</label><input data-jp-name autocomplete="off" value="'+esc(record.name||'')+'" '+(disabled?'disabled':'')+' placeholder="BENEFICIÁRIO"></div>'
      +'<div class="jpRcpField"><label>CPF</label><input data-jp-cpf autocomplete="off" inputmode="numeric" maxlength="14" placeholder="'+(privateAllowed?maskCpf(record.cpf):'ACESSO RESTRITO')+'" '+(disabled?'disabled':'')+' value=""></div>'
      +'<span class="jpRcpStatus jpRcpTag">'+esc(record.status||'A DEFINIR')+'</span>'
      +'<div class="jpRcpActions"><button class="jpRcpBtn" data-jp-seat-save="'+esc(key)+'" '+(disabled?'disabled':'')+'>SALVAR</button>'
      +(privateAllowed&&record.status==='IDENTIFICADO'?'<button class="jpRcpBtn primary" data-jp-seat-use="'+esc(key)+'">BAIXA</button>':'')+'</div></div>';
   }
  }
  html+='</div>';
 }
 return html;
}
function renderEditor(){
 const host=el('jpRcpEditor'),promo=getPromo(selected);
 if(!host||!promo){if(host)host.hidden=true;return;}
 host.hidden=false;const cfg=config(selected)||{},links=list(cfg.events),rights=Number(cfg.rights)||2;
 const winnerCount=winners(promo).length;
 host.innerHTML='<div class="jpRcpPanelTitle"><h3>PASSAPORTE · '+esc(promoTitle(promo))+'</h3><button class="jpRcpBtn" data-jp-close>FECHAR</button></div>'
  +'<p class="jpRcpSmall">VINCULE EVENTOS QUE JÁ EXISTEM NA DISTRIBUIÇÃO. OS INGRESSOS CONTINUAM NO ESTOQUE ORIGINAL, SEM DUPLO DESCONTO.</p>'
  +'<div class="jpRcpLine"><div class="jpRcpField"><label>EVENTO / PRÊMIO</label>'+eventSelectHtml(cfg)+'</div>'
  +'<div class="jpRcpField"><label>SEGMENTO</label><select id="jpRcpSegment">'+Object.entries(C.segments).map(([k,v])=>'<option value="'+k+'" '+(k==='reservado'?'selected':'')+'>'+v+'</option>').join('')+'</select></div>'
  +'<div class="jpRcpField"><label>UNIDADES FÍSICAS</label><input id="jpRcpQty" type="number" min="1" value="'+C.plannedWinners(promo)*rights+'"></div>'
  +'<button class="jpRcpBtn primary" data-jp-link '+(!enabledMeta()?'disabled':'')+'>VINCULAR</button></div>'
  +'<div id="jpRcpReservationBlock" class="jpRcpField" style="max-width:370px;margin:10px 0"><label>RESERVA ESPECÍFICA</label><select id="jpRcpReservation"></select></div>'
  +'<div class="jpRcpPanelTitle"><span id="jpRcpStockHint" class="jpRcpSmall"></span><div class="jpRcpField" style="max-width:110px"><label>INGRESSOS / GANHADOR</label><input id="jpRcpRights" type="number" min="1" max="12" value="'+rights+'" '+(links.length?'disabled':'')+'></div></div>'
  +'<label class="jpRcpSmall"><input id="jpRcpTransfer" type="checkbox" '+(cfg.allowTransfer?'checked':'')+' '+(links.length?'disabled':'')+'> PERMITIR INDICAÇÃO / TRANSFERÊNCIA PARA TERCEIROS CONFORME REGULAMENTO</label>'
  +(!enabledMeta()?'<div class="jpRcpWarning">VÍNCULOS EM LEITURA SOMENTE. É NECESSÁRIA HOMOLOGAÇÃO DO A09 ANTES DA GRAVAÇÃO.</div>':'')
  +'<div class="jpRcpPanelTitle" style="margin-top:12px"><h3>EVENTOS VINCULADOS</h3><span class="jpRcpTag">'+links.length+' EVENTO(S)</span></div>'
  +(links.length?links.map(eventLine).join(''):'<div class="jpRcpEmpty">NENHUM EVENTO VINCULADO.</div>')
  +(links.length?nominal(cfg):'');
 refreshReservation();
}
function disconnectPrivate(){
 if(privateListener){try{privateListener.off('value');}catch(e){}privateListener=null;}
 privateAllowed=false;privateData={};privateId='';
}
async function authPrivate(){
 disconnectPrivate();
 if(!enabledPrivate())return false;
 const op=await identity(),openedPromo=selected;
 const ref=db().ref(privatePath).child(encode(openedPromo));
 const value=(await ref.get()).val()||{};
 if(selected!==openedPromo)return false;
 privateAllowed=true;privateData=value;privateId=openedPromo;
 privateListener=ref;
 ref.on('value',snap=>{
  if(selected!==openedPromo||!privateAllowed)return;
  privateData=snap.val()||{};
  renderEditor();
 },error=>{
  console.warn('PASSAPORTE: PERMISSÃO PRIVADA REVOGADA',error?.code||'');
  disconnectPrivate();renderEditor();
 });
 return op;
}
async function openPassport(id){
 if(!getPromo(id)){note('PROMOÇÃO NÃO ENCONTRADA.',true);return;}
 disconnectPrivate();selected=id;activate('passaportes');renderEditor();
 try{await authPrivate();}catch(e){privateAllowed=false;console.warn('ACESSO PRIVADO NEGADO');}
 renderEditor();el('jpRcpEditor')?.scrollIntoView({behavior:'smooth',block:'nearest'});
}
async function link(){
 if(busy)return;busy=true;let failure='';
 try{
  if(!enabledMeta())throw Error('VÍNCULOS AGUARDANDO HOMOLOGAÇÃO.');
  const op=await identity();await ensureReceptionOnline();
  const p=getPromo(selected),e=inventory().find(x=>x.id===el('jpRcpSelectEvent')?.value);
  if(!p||!e)throw Error('ESCOLHA UM EVENTO OFICIAL.');
  const segment=el('jpRcpSegment')?.value,reservationId=segment==='reservado'?el('jpRcpReservation')?.value:'',units=Number(el('jpRcpQty')?.value),rights=Number(el('jpRcpRights')?.value);
  const allowTransfer=!!el('jpRcpTransfer')?.checked,promoId=selected,key=encode(promoId),stamp=new Date().toISOString();
  const tx=await root().transaction(current=>{
   failure='';const validation=C.validateLink(current,{promoId,monthKey:e.month,distributionId:e.d.id,segment,reservationId,units,rights});
   if(!validation.ok){failure=validation.reason;return;}
   const configs=current.passportCampaigns||{},old=configs[key]||{},events=list(old.events);
   if(events.some(r=>r.monthKey===e.month&&r.distributionId===e.d.id)){failure='EVENTO JÁ VINCULADO.';return;}
   const candidate={id:e.id,monthKey:e.month,distributionId:e.d.id,date:e.date,segment,reservationId,units,linkedAt:stamp,linkedBy:op.uid};
   current.passportCampaigns={...configs,[key]:{...old,promoId,rights,allowTransfer:events.length?!!old.allowTransfer:allowTransfer,events:[...events,candidate],updatedAt:stamp,updatedBy:op.uid}};
   current.passportAudit=[...list(current.passportAudit),{kind:'LINK',promoId,distributionId:e.d.id,monthKey:e.month,segment,reservationId,units,uid:op.uid,at:stamp}].slice(-2000);
   return current;
  },undefined,false);
  if(!tx?.committed)throw Error(failure||'NÃO CONFIRMADO PELO FIREBASE.');
  const v=(await root().child('passportCampaigns').child(key).get()).val();
  if(!list(v?.events).some(x=>x.id===e.id))throw Error('GRAVAÇÃO NÃO CONFERIDA. NÃO REPITA AUTOMATICAMENTE.');
  note('EVENTO VINCULADO SEM DUPLICAR DESCONTO DO ESTOQUE.');
 }catch(e){note(e.message,true);}finally{busy=false;renderEditor();}
}
async function unlink(key){
 if(busy)return;busy=true;let fail='';
 try{
  if(!enabledMeta())throw Error('ALTERAÇÃO NÃO HOMOLOGADA.');
  const op=await identity();await ensureReceptionOnline();
  if(winners(getPromo(selected)).length)throw Error('NÃO É PERMITIDO DESVINCULAR COM GANHADORES CONFIRMADOS.');
  const pid=selected,k=encode(pid),now=new Date().toISOString();
  const tx=await root().transaction(current=>{
   fail='';const old=current?.passportCampaigns?.[k],events=list(old?.events);
   const link=events.find(r=>C.capKey(r.monthKey,r.distributionId)===key);
   if(!link){fail='EVENTO NÃO ENCONTRADO NO PASSAPORTE.';return;}
   current.passportCampaigns[k]={...old,events:events.filter(x=>x!==link),updatedAt:now,updatedBy:op.uid};
   current.passportAudit=[...list(current.passportAudit),{kind:'UNLINK',promoId:pid,distributionId:link.distributionId,uid:op.uid,at:now}].slice(-2000);
   return current;
  },undefined,false);
  if(!tx?.committed)throw Error(fail||'NÃO CONFIRMADO.');
  note('EVENTO DESVINCULADO.');
 }catch(e){note(e.message,true);}finally{busy=false;renderEditor();}
}
function locateSeat(key){
 const promo=getPromo(selected),cfg=config(selected);
 for(const l of list(cfg?.events))for(const w of winners(promo))for(let i=1;i<=(Number(cfg.rights)||2);i++){
  if(seatKey(l,w,i)===key)return {promo,cfg,l,w,seat:i};
 }
 return null;
}
async function verifyOfficialWinner(promoId,winnerId){
 const months=Object.entries(state.months||{}).filter(([month,m])=>list(m?.promos).some(p=>p.id===promoId)).map(([month])=>month);
 if(!months.length)throw Error('PROMOÇÃO ORIGINAL NÃO LOCALIZADA NO HISTÓRICO.');
 for(const month of months){
  const snap=await root().child('months').child(month).child('promos').get();
  const source=list(snap.val()).find(p=>p.id===promoId);
  if(source&&C.winnerRows(source).some(w=>w.id===winnerId))return true;
 }
 throw Error('GANHADOR OFICIAL FOI ALTERADO OU NÃO FOI LOCALIZADO. ATUALIZE A FICHA.');
}
async function writeSeat(key,used=false){
 if(busy)return;busy=true;
 try{
  if(!privateAllowed||privateId!==selected||!enabledPrivate())throw Error('ACESSO PRIVADO NÃO HOMOLOGADO.');
  const activeId=selected,op=await identity(),where=locateSeat(key);
  const box=Array.from(document.querySelectorAll('[data-jp-seat]')).find(x=>x.dataset.jpSeat===key);
  if(!where||!box)throw Error('INGRESSO NÃO LOCALIZADO.');
  const prior=privateData.tickets?.[key]||{},
   name=used?prior.name:safe(box.querySelector('[data-jp-name]')?.value),
   cpf=used?prior.cpf:safe(box.querySelector('[data-jp-cpf]')?.value);
  const next={name,cpf,status:used?'UTILIZADO':'IDENTIFICADO'};
  const validity=C.transition(prior,next);if(!validity.ok)throw Error(validity.reason);
  if(!where.cfg.allowTransfer&&C.normalize(name)!==where.w.name)throw Error('INDICAÇÃO/TRANSFERÊNCIA NÃO PERMITIDA PELO REGULAMENTO.');
  if(used&&!window.confirm('CONFIRMAR BAIXA NOMINAL DESTE INGRESSO?'))return;
  // Revalidar o direito na fonte oficial, evitando gravar um destinatário de evento removido.
  const liveConfig=(await root().child('passportCampaigns').child(encode(selected)).get()).val();
  if(!list(liveConfig?.events).some(row=>row.id===where.l.id&&row.monthKey===where.l.monthKey))throw Error('EVENTO VINCULADO FOI ALTERADO. REABRA A FICHA.');
  if(Number(liveConfig.rights)!==Number(where.cfg.rights))throw Error('DIREITO POR GANHADOR ALTERADO EM OUTRO COMPUTADOR.');
  await verifyOfficialWinner(activeId,where.w.id);
  if(selected!==activeId)throw Error('A FICHA ATIVA MUDOU. ABRA NOVAMENTE O GANHADOR.');
  const now=new Date().toISOString(),rev=Number(prior.revision||0),operationId='OP_'+Date.now()+'_'+Math.random().toString(36).slice(2,10);
  let failure='';
  const recordRef=db().ref(privatePath).child(encode(activeId));
  const tx=await recordRef.transaction(current=>{
   failure='';current=current||{tickets:{},audit:{}};
   const latest=current.tickets?.[key]||{};
   if(Number(latest.revision||0)!==rev||latest.status==='UTILIZADO'){failure='REGISTRO ALTERADO POR OUTRO OPERADOR OU JÁ UTILIZADO.';return;}
   const record={...latest,...next,revision:rev+1,winnerId:where.w.id,linkId:where.l.id,seat:where.seat,
    updatedAt:now,updatedBy:op.uid,operationId, ...(used?{usedAt:now,usedBy:op.uid}:{})};
   current.tickets={...(current.tickets||{}),[key]:record};
   const transferred=!!latest.name&&C.normalize(latest.name)!==C.normalize(name);
   current.audit={...(current.audit||{}),[operationId]:{id:operationId,action:used?'BAIXA':transferred?'TRANSFERÊNCIA':'IDENTIFICAÇÃO',
    key,revision:rev+1,uid:op.uid,at:now,prevStatus:latest.status||'A DEFINIR',status:next.status,
    previousName:latest.name||'',currentName:name}};
   return current;
  },undefined,false);
  if(!tx?.committed)throw Error(failure||'GRAVAÇÃO NOMINAL NÃO CONFIRMADA.');
  const fresh=(await recordRef.child('tickets').child(key).get()).val();
  if(fresh?.operationId!==operationId)throw Error('A ALTERAÇÃO NÃO CONFERIU NO SERVIDOR.');
  privateData=(await recordRef.get()).val()||{};note(used?'BAIXA CONFIRMADA NO REGISTRO NOMINAL.':'BENEFICIÁRIO CONFIRMADO NO REGISTRO NOMINAL.');
 }catch(e){note(e.message,true);}finally{busy=false;renderEditor();}
}
function results(id){
 const p=getPromo(id),host=Array.from(document.querySelectorAll('[data-jp-result]')).find(x=>x.dataset.jpResult===id);
 if(!p||!host){note('CONSULTE OS RESULTADOS NA LISTA PRINCIPAL.',true);return;}
 host.innerHTML='<div class="jpRcpEditor"><div class="jpRcpPanelTitle"><h3>'+esc(promoTitle(p))+'</h3></div>'+
  (winners(p).map(w=>'<div class="jpRcpEventLine"><strong>'+esc(w.name)+'</strong><span>'+esc(w.slot)+'</span></div>').join('')||'<div class="jpRcpEmpty">SEM RESULTADOS CADASTRADOS.</div>')+'</div>';
 host.hidden=!host.hidden;
}
function build(){
 const area=el('receptionCampaignList')?.closest('.receptionCampaignSection'),header=area?.querySelector('.receptionCampaignHeading');
 if(!area||!header)return;
 const bar=document.createElement('div');bar.id='jpRcpTabs';bar.className='jpReceptionTabs';
 bar.innerHTML=['ativas','fixadas','historico','passaportes'].map(x=>
 '<button class="jpReceptionTab" role="tab" aria-selected="'+(x==='ativas')+'" data-jp-tab="'+x+'">'+x.toUpperCase()+'</button>').join('')+
 '<select id="jpRcpYear" class="jpReceptionYear" hidden aria-label="Ano do histórico">'+Array.from({length:8},(_,i)=>new Date().getFullYear()-i).map(y=>'<option value="'+y+'">'+y+'</option>').join('')+'</select>';
 header.insertAdjacentElement('afterend',bar);
 const labels=area.querySelector('.receptionCampaignLabels');if(labels)labels.id='receptionCampaignLabels';
 const editor=document.createElement('div');editor.id='jpRcpEditor';editor.className='jpRcpEditor';editor.hidden=true;area.appendChild(editor);
 const menuEl=document.createElement('div');menuEl.id='jpRcpMenu';menuEl.className='jpRcpPop';menuEl.hidden=true;menuEl.setAttribute('role','menu');document.body.appendChild(menuEl);
}
document.addEventListener('click',e=>{
 const tabBtn=e.target.closest('[data-jp-tab]');
 if(tabBtn){e.preventDefault();e.stopImmediatePropagation();activate(tabBtn.dataset.jpTab);return;}
 const menuButton=e.target.closest('[data-jp-menu]');
 if(menuButton){e.preventDefault();e.stopImmediatePropagation();const b=menuButton.getBoundingClientRect();menu(menuButton.dataset.jpMenu,b.left,b.bottom+5);return;}
 const op=e.target.closest('[data-jp-action]');
 if(op){e.preventDefault();e.stopImmediatePropagation();const target=menuId;closeMenu();
  if(op.dataset.jpAction==='pin')pin(target);
  else if(op.dataset.jpAction==='history'){year=Number(yearOf(getPromo(target)))||new Date().getFullYear();const y=el('jpRcpYear');if(y)y.value=year;activate('historico');}
  else if(op.dataset.jpAction==='passport')openPassport(target);else results(target);return;}
 const open=e.target.closest('[data-jp-open]');
 if(open){e.preventDefault();e.stopImmediatePropagation();if(config(open.dataset.jpOpen))openPassport(open.dataset.jpOpen);else results(open.dataset.jpOpen);return;}
 const close=e.target.closest('[data-jp-close]');if(close){e.preventDefault();e.stopImmediatePropagation();selected='';disconnectPrivate();el('jpRcpEditor').hidden=true;return;}
 const add=e.target.closest('[data-jp-link]');if(add){e.preventDefault();e.stopImmediatePropagation();link();return;}
 const remove=e.target.closest('[data-jp-unlink]');if(remove){e.preventDefault();e.stopImmediatePropagation();unlink(remove.dataset.jpUnlink);return;}
 const save=e.target.closest('[data-jp-seat-save]');if(save){e.preventDefault();e.stopImmediatePropagation();writeSeat(save.dataset.jpSeatSave);return;}
 const use=e.target.closest('[data-jp-seat-use]');if(use){e.preventDefault();e.stopImmediatePropagation();writeSeat(use.dataset.jpSeatUse,true);return;}
 if(!e.target.closest('#jpRcpMenu'))closeMenu();
},true);
document.addEventListener('contextmenu',e=>{
 const card=e.target.closest('[data-jp-promo],details[data-reception-campaign]');
 if(!card)return;e.preventDefault();e.stopImmediatePropagation();
 menu(card.dataset.jpPromo||card.dataset.receptionCampaign,e.clientX,e.clientY);
},true);
document.addEventListener('change',e=>{
 if(e.target.id==='jpRcpYear'){year=Number(e.target.value)||year;rerender();}
 if(['jpRcpSelectEvent','jpRcpSegment','jpRcpReservation','jpRcpQty','jpRcpRights'].includes(e.target.id))refreshReservation();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
window.JPReceptionPassport={
 alternative,active,isPinned,rerender,openPassport,
 get tab(){return tab;},get pins(){return pins;},get passports(){return passports;}
};
build();
root().child('receptionCampaignPins').on('value',snap=>{pins=snap.val()||{};rerender();},error=>console.warn('FIXADAS SEM PERMISSÃO DE LEITURA',error));
root().child('passportCampaigns').on('value',snap=>{passports=snap.val()||{};rerender();},error=>console.warn('PASSAPORTE SEM PERMISSÃO DE LEITURA',error));
const q=new URLSearchParams(window.location.search).get('passaporte');
if(q){
 let started=false;
 const go=()=>{if(started||!getPromo(q))return;started=true;openPassport(q);};
 root().child('months').on('child_added',go);Promise.resolve().then(go);
}
})();
