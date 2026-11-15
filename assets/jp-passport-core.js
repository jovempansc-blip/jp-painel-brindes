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
  return normalize(b?.name).split(' ').filter(Boolean).length>=2&&(!String(b?.cpf||'').trim()||validateCpf(b?.cpf));
 }
 function transition(old,next,{allowUndo=false}={}){
  if(old?.status==='UTILIZADO'&&!allowUndo)return {ok:false,reason:'INGRESSO JÁ UTILIZADO: ALTERAÇÃO BLOQUEADA.'};
  if(next?.status==='UTILIZADO'&&!validBeneficiary(next))return {ok:false,reason:'IDENTIFICAÇÃO COMPLETA OBRIGATÓRIA ANTES DA BAIXA.'};
  if(['IDENTIFICADO','UTILIZADO'].includes(next?.status)&&!validBeneficiary(next))return {ok:false,reason:'NOME COMPLETO OBRIGATÓRIO. CPF OPCIONAL DEVE SER VÁLIDO SE INFORMADO.'};
  return {ok:true};
 }

 // Mesma identidade determinística utilizada pela Recepção desde a primeira versão do Passaporte.
 const encode=x=>Array.from(String(x||'')).map(c=>c.codePointAt(0).toString(16)).join('-');
 function ticketId(promoId,link,winnerId,seat){
  if(!promoId||!link?.monthKey||!link?.distributionId||!winnerId||!Number.isSafeInteger(Number(seat))||Number(seat)<1)return '';
  return encode([promoId,link.monthKey,link.distributionId,winnerId,seat].join('|'));
 }
 function reconcilePassport({promoId,config={},winners=[],tickets={},months={},passportCampaigns={}}={}){
  const people=list(winners).filter(w=>w?.id),events=list(config?.events);
  const rights=Math.max(1,Math.min(12,Math.floor(Number(config.rights)||2)));
  const byWinner=people.map(w=>({id:w.id,name:w.name,used:0,identified:0,pending:0,total:0,events:[]}));
  const summary={eventCount:events.length,winnerCount:people.length,rights,allocated:0,entitlements:0,used:0,identified:0,
   pending:0,unassigned:0,unallocated:0,errors:[]};
  const byEvent=events.map(link=>{
   const allocated=units(link.units),required=people.length*rights;
   const event={id:capKey(link.monthKey,link.distributionId),date:link.date||'',distributionId:link.distributionId,
    segment:link.segment,reservationId:link.reservationId||'',allocated,required,
    used:0,identified:0,unassigned:0,pending:0,unallocated:Math.max(0,allocated-required)};
   summary.allocated+=allocated;summary.entitlements+=required;
   // Comparação somente leitura com a Distribuição Geral e TODAS as campanhas.
   const dist=lookupDist(months,link.monthKey,link.distributionId);
   if(Object.keys(months).length&&!dist)
    summary.errors.push('PRÊMIO '+link.distributionId+' NÃO ENCONTRADO NA COMPETÊNCIA '+link.monthKey+'.');
   if(dist){
    const total=capacity(dist,link.segment),claimed=commitments({passportCampaigns},link.monthKey,link.distributionId,link.segment);
    event.distributionCapacity=total;event.totalCommitted=claimed;event.freeCapacity=Math.max(0,total-claimed);
    if(claimed>total)summary.errors.push('SEGMENTO '+link.segment+' DO EVENTO '+link.distributionId+' EXCEDE A COTA FÍSICA.');
    if(link.segment==='reservado'&&link.reservationId){
     const reserve=reservations(dist).find(r=>r.id===link.reservationId);
     const occupied=commitments({passportCampaigns},link.monthKey,link.distributionId,link.segment,link.reservationId);
     if(!reserve||occupied>reserve.units)summary.errors.push('RESERVA '+link.reservationId+' DO EVENTO '+link.distributionId+' POSSUI COMPROMISSO EXCEDENTE.');
    }
   }
   if(required>allocated)summary.errors.push('EVENTO '+link.distributionId+': '+required+' INGRESSOS DE DIREITO E '+allocated+' RESERVADOS.');
   for(const person of byWinner){
    const progress={eventId:event.id,used:0,identified:0,unassigned:0};
    for(let seat=1;seat<=rights;seat++){
     const id=ticketId(promoId,link,person.id,seat),record=tickets[id]||{},status=record.status||'A DEFINIR';
     const kind=status==='UTILIZADO'?'used':status==='IDENTIFICADO'?'identified':'unassigned';
     progress[kind]++;event[kind]++;
     person[kind==='unassigned'?'pending':kind]++;person.total++;
    }
    person.events.push(progress);
   }
   event.pending=required-event.used;
   summary.used+=event.used;summary.identified+=event.identified;summary.unassigned+=event.unassigned;
   summary.unallocated+=event.unallocated;summary.pending+=event.pending;
   return event;
  });
  if(summary.used>summary.allocated)summary.errors.push('BAIXAS SUPERIORES AO TOTAL RESERVADO.');
  return {summary,byWinner,byEvent};
 }
 return Object.freeze({segments,units,pair,list,capKey,normalize,reservations,capacity,lookupPromo,lookupDist,plannedWinners,winnerRows,commitments,validateLink,assertDistributionChange,validateCpf,validBeneficiary,transition,ticketId,reconcilePassport});
});
