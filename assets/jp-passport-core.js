(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.JPPassportCore=api;
})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const units=x=>Number.isFinite(Number(x))?Math.max(0,Number(x)):0;
 const pair=x=>['pair','par','pares'].includes(String(x||'').toLowerCase().trim());
 const list=x=>Array.isArray(x)?x.filter(Boolean):Object.values(x||{}).filter(Boolean);
 const capKey=(m,id)=>encodeURIComponent(String(m)+'|'+String(id));
 const segments={reservado:'RESERVADO',ar:'RÁDIO',rs:'REDES SOCIAIS',rua:'EXTERNA',app:'APP',camarim:'CAMARIM',camarote:'CAMAROTE'};
 const normalize=x=>String(x??'').trim().replace(/\s+/g,' ').toUpperCase();
 function reservations(d){
  const rows=list(d?.reservas||d?.reservations);
  if(rows.length)return rows.map((r,i)=>({
   id:String(r.id||''),label:String(r.note||r.observacao||r.description||'RESERVA '+(i+1)),
   units:units(r.qty??r.quantidade??r.total??r.value)*(pair(r.unit??r.tipo??d?.ticketUnits?.reservado??d?.ticketDefaultUnit)?2:1),
   stable:!!r.id
  })).filter(r=>r.units>0);
  const qty=units(d?.reservado)*(pair(d?.ticketUnits?.reservado??d?.ticketDefaultUnit)?2:1);
  return qty?[{id:'LEGACY_RESERVA',label:'RESERVA ORIGINAL',units:qty,stable:true}]:[];
 }
 function capacity(d,segment){
  if(segment==='reservado')return reservations(d).reduce((sum,r)=>sum+r.units,0);
  return units(d?.[segment])*(pair(d?.ticketUnits?.[segment]??d?.ticketDefaultUnit)?2:1);
 }
 function lookupPromo(months,id){
  for(const [m,v] of Object.entries(months||{})){const p=list(v?.promos).find(p=>String(p.id)===String(id));if(p)return {p,month:m};}
  return null;
 }
 function lookupDist(months,m,id){return list(months?.[m]?.distributions).find(d=>String(d.id)===String(id))||null;}
 function plannedWinners(p){
  const occ=list(p?.occurrences).filter(o=>!['CANCELADO','CANCELADA'].includes(normalize(o.status)));
  return occ.length?occ.reduce((sum,o)=>sum+Math.max(1,units(o.qtyPlanned||p.winnersPerDraw||p.qtyPerDraw||1)),0)
   :Math.max(1,units(p?.winnersPerDraw||p?.qtyPerDraw||1));
 }
 function winnerRows(p){
  const found=[],used=new Set(),byHour=Object.entries(p?.resultWinnersByHour||{}).filter(([,v])=>Array.isArray(v)&&v.length);
  const add=(w,k)=>{
   const name=normalize(typeof w==='string'?w:w?.fullName||w?.name);
   const id=String(w?.id||'');if(!name)return;
   const key=id||name+'|'+k;if(used.has(key))return;
   used.add(key);found.push({id,name,slot:k,key});
  };
  if(byHour.length)byHour.forEach(([k,rows])=>rows.forEach(w=>add(w,k)));
  else {list(p?.resultWinners).forEach(w=>add(w,'legacy'));if(!found.length)String(p?.resultName||'').split(',').forEach(w=>add(w,'legacy'));}
  return found;
 }
 function commitments(state,m,distId,segment,reservationId=''){
  let out=0;
  for(const cfg of Object.values(state?.passportCampaigns||{}))for(const link of list(cfg?.events)){
   if(String(link.monthKey)!==String(m)||String(link.distributionId)!==String(distId)||link.segment!==segment)continue;
   if(reservationId&&link.reservationId&&String(link.reservationId)!==String(reservationId))continue;
   out+=units(link.units);
  }
  return out;
 }
 function validateLink(state,{promoId,monthKey,distributionId,segment,units:quantity,rights=2,reservationId=''}) {
  const amount=Number(quantity),seats=Number(rights),months=state?.months||{};
  if(!promoId||!monthKey||!distributionId||!Object.hasOwn(segments,segment)||!Number.isSafeInteger(amount)||amount<1||!Number.isSafeInteger(seats)||seats<1||seats>12)
   return {ok:false,code:'INPUT',reason:'INFORME PRÊMIO, SEGMENTO E QUANTIDADES VÁLIDAS.'};
  const promo=lookupPromo(months,promoId)?.p,dist=lookupDist(months,monthKey,distributionId);
  if(!promo)return {ok:false,code:'PROMO',reason:'PROMOÇÃO NÃO ENCONTRADA.'};
  if(normalize(promo.kind||promo.promoKind||promo.type)!=='PROMO')return {ok:false,code:'KIND',reason:'ESTE CADASTRO NÃO É UMA PROMOÇÃO DE SORTEIO.'};
  if(!dist)return {ok:false,code:'DIST',reason:'PRÊMIO NÃO ENCONTRADO NA COMPETÊNCIA SELECIONADA.'};
  if(dist.prizeType!=='ingresso'&&dist.ticketMode!=='ingresso'&&dist.isTicket!==true)
   return {ok:false,code:'NOT_TICKET',reason:'O PRÊMIO SELECIONADO NÃO É UM INGRESSO.'};
  const cfg=Object.values(state?.passportCampaigns||{}).find(x=>x?.promoId===promoId)||state?.passportCampaigns?.[promoId]||{},links=list(cfg.events);
  if(links.some(link=>String(link.monthKey)===String(monthKey)&&String(link.distributionId)===String(distributionId)))
   return {ok:false,code:'DUPLICATE',reason:'ESTE EVENTO JÁ ESTÁ VINCULADO À PROMOÇÃO.'};
  if(links.length&&Number(cfg.rights)!==seats)
   return {ok:false,code:'RIGHTS_LOCKED',reason:'O DIREITO POR GANHADOR JÁ ESTÁ FIXADO PARA A CAMPANHA.'};
  const needed=plannedWinners(promo)*seats;
  if(amount<needed)return {ok:false,code:'INSUFFICIENT_WINNERS',reason:'A PROMOÇÃO EXIGE '+needed+' INGRESSOS PARA COBRIR OS GANHADORES PROGRAMADOS.'};
  const free=capacity(dist,segment)-commitments(state,monthKey,distributionId,segment);
  if(amount>free)return {ok:false,code:'INSUFFICIENT_SEGMENT',reason:'SALDO DO SEGMENTO INSUFICIENTE: '+free+' UNIDADES DISPONÍVEIS.'};
  if(segment==='reservado'){
   const rows=reservations(dist);
   if(rows.some(x=>!x.stable))return {ok:false,code:'UNSTABLE_RESERVATIONS',reason:'EXISTEM RESERVAS SEM IDENTIFICADOR. REGULARIZE-AS.'};
   if(!reservationId&&rows.length!==1)return {ok:false,code:'SELECT_RESERVATION',reason:'SELECIONE A RESERVA ESPECÍFICA DE ORIGEM.'};
   const selected=rows.find(r=>r.id===String(reservationId||rows[0]?.id||''));
   if(!selected)return {ok:false,code:'RESERVATION_NOT_FOUND',reason:'RESERVA DE ORIGEM NÃO ENCONTRADA.'};
   const freeReservation=selected.units-commitments(state,monthKey,distributionId,segment,selected.id);
   if(amount>freeReservation)return {ok:false,code:'INSUFFICIENT_RESERVATION',reason:'RESERVA '+selected.label+' POSSUI SOMENTE '+freeReservation+' UNIDADES DISPONÍVEIS.'};
  }
  return {ok:true,promo,dist,free,needed};
 }
 function assertDistributionChange(state,monthKey,proposed){
  const relevant=Object.values(state?.passportCampaigns||{}).flatMap(c=>list(c.events))
   .filter(e=>e.monthKey===monthKey&&e.distributionId===proposed.id);
  if(!relevant.length)return {ok:true};
  const issues=[];
  const totals={};
  for(const l of relevant){
   totals[l.segment]=(totals[l.segment]||0)+units(l.units);
   if(l.segment==='reservado'&&l.reservationId){
    const rows=reservations(proposed),match=rows.find(r=>r.id===l.reservationId);
    const consumed=relevant.filter(e=>e.segment==='reservado'&&e.reservationId===l.reservationId).reduce((n,e)=>n+units(e.units),0);
    if(!match||match.units<consumed)issues.push('RESERVA '+l.reservationId+' COMPROMETIDA: '+consumed+' UNIDADES.');
   }
  }
  for(const [segment,amount] of Object.entries(totals))if(capacity(proposed,segment)<amount)
   issues.push('SEGMENTO '+segments[segment]+' COMPROMETIDO: '+amount+' UNIDADES FÍSICAS.');
  return issues.length?{ok:false,reason:issues.join(' '),issues}:{ok:true};
 }
 function validateCpf(value){
  const v=String(value||'').replace(/\D/g,'');
  if(v.length!==11||/^(\d)\1+$/.test(v))return false;
  for(let n=9;n<=10;n++){
   let total=0;for(let i=0;i<n;i++)total+=Number(v[i])*(n+1-i);
   if((total*10)%11%10!==Number(v[n]))return false;
  }
  return true;
 }
 function validBeneficiary(b){
  return normalize(b?.name).split(' ').filter(Boolean).length>=2&&validateCpf(b?.cpf);
 }
 function transition(old,next,{allowUndo=false}={}){
  if(old?.status==='UTILIZADO'&&!allowUndo)return {ok:false,reason:'INGRESSO JÁ UTILIZADO: ALTERAÇÃO BLOQUEADA.'};
  if(next?.status==='UTILIZADO'&&!validBeneficiary(next))return {ok:false,reason:'IDENTIFICAÇÃO COMPLETA OBRIGATÓRIA ANTES DA BAIXA.'};
  if(['IDENTIFICADO','UTILIZADO'].includes(next?.status)&&!validBeneficiary(next))return {ok:false,reason:'NOME COMPLETO E CPF VÁLIDO OBRIGATÓRIOS.'};
  return {ok:true};
 }
 return Object.freeze({segments,units,pair,list,capKey,normalize,reservations,capacity,lookupPromo,lookupDist,plannedWinners,winnerRows,commitments,validateLink,assertDistributionChange,validateCpf,validBeneficiary,transition});
});
