/* AV58.1.37 — regra compartilhada de devoluções e saldo reprogramável.
 * Somente leitura: não modifica estoque, cota, resultados ou histórico.
 * Uma unidade operacional = uma premiação (PAR vale 2 unidades físicas).
 */
(function(root){
  'use strict';
  const list=v=>Array.isArray(v)?v.filter(Boolean):Object.values(v||{}).filter(Boolean);
  const amount=v=>Math.max(0,Math.floor(Number(v)||0));
  const unit=v=>String(v||'').toLowerCase()==='pair'?'pair':'unit';
  const unitSize=v=>unit(v)==='pair'?2:1;
  const datePart=v=>String(v||'').slice(0,10);
  const active=i=>i&&String(i.channel||'').toUpperCase()==='RÁDIO'&&!['CANCELADO','CANCELADA'].includes(String(i.status||'').toUpperCase());
  function status(v){return String(v||'').trim().toLowerCase();}
  function prizeUnits(dist){return unit(dist?.ticketUnits?.ar||dist?.ticketDefaultUnit);}
  function normalizedTime(raw){const m=String(raw||'').match(/^(\d{1,2})(?:H|:)?(\d{2})?$/i);return m?`${m[1].padStart(2,'0')}${m[2]||'00'}`:'';}
  function compute({month={},distribution={},monthKey='',today='',itemsOverride=null,promosOverride=null}={}){
    const id=String(distribution.id||'');
    const code=monthKey||String(distribution.snapshotMonth||'');
    const now=datePart(today),start=datePart(distribution.startDate||distribution.date),end=datePart(distribution.endDate||distribution.startDate||distribution.date);
    const inValidity=!!now&&(!start||now>=start)&&(!end||now<=end);
    const items=list(itemsOverride===null?month.items:itemsOverride);
    const promos=list(promosOverride===null?month.promos:promosOverride);
    const originalItems=items.filter(i=>i?.distributionId===id&&active(i)&&datePart(i.date).slice(0,7)===code);
    const seenItems=new Set(),unique=[];
    originalItems.forEach(i=>{const key=String(i.id||`${i.date}|${i.slot}|${i.prize}`);if(!seenItems.has(key)){seenItems.add(key);unique.push(i);}});
    const programmed=unique.reduce((s,i)=>s+amount(i.qty),0);
    const radioQuota=amount(distribution.ar);
    const returnUnit=prizeUnits(distribution),requiredUnits=unitSize(returnUnit);
    const returns=[],issues=[],sourceSeen=new Set();
    const track=(sourceId,recordStatus,delivered,sourceUnits,linkId='',sourceDate='')=>{
      if(sourceSeen.has(sourceId))return;
      sourceSeen.add(sourceId);
      if(!['sobra','realocado','reaproveitado'].includes(status(recordStatus))||delivered)return;
      if(!inValidity){issues.push({code:'OUT_OF_VALIDITY',sourceId});return;}
      if(sourceDate&&sourceDate.slice(0,7)!==code){issues.push({code:'MONTH_MISMATCH',sourceId});return;}
      if(!Number.isInteger(sourceUnits)||sourceUnits<1||sourceUnits!==requiredUnits){issues.push({code:'UNIT_MISMATCH',sourceId,sourceUnits,requiredUnits});return;}
      const isReused=status(recordStatus)!=='sobra';
      const linked=unique.some(i=>i.returnedReuse&&((linkId&&i.id===linkId)||i.returnedFrom===sourceId||list(i.returnSourceIds).includes(sourceId)));
      if(isReused&&!linked){issues.push({code:'UNVERIFIED_REUSE',sourceId});return;}
      returns.push({sourceId,status:isReused?'realocado':'sobra',physicalUnits:sourceUnits,operationalUnits:1,linkId:linkId||'',date:sourceDate});
    };
    // Item convencional: novo registro por ganhador quando existirem múltiplos;
    // dados legados com vários nomes mas SOBRA global são ambíguos e não recebem crédito.
    unique.filter(i=>i.sourceType!=='promo-result').forEach(i=>{
      const names=Array.isArray(i.winnerNames)&&i.winnerNames.length?i.winnerNames.filter(Boolean):String(i.winnerName||'').split(',').map(s=>s.trim()).filter(Boolean);
      if(!names.length)return;
      const deliveries=list(i.winnerDeliveries),multiple=names.length>1;
      const explicitUnits=Number(i.returnUnitsPerWinner||i.stockUnitsPerWinner||i.prizeUnitsPerWinner);
      const stockTotal=Number(i.stockUnits);
      const fromStock=Number.isSafeInteger(stockTotal)&&stockTotal>0&&stockTotal%names.length===0?stockTotal/names.length:null;
      const size=Number.isSafeInteger(explicitUnits)&&explicitUnits>0?explicitUnits:(fromStock||requiredUnits);
      let creditedThisItem=0;
      names.forEach((name,idx)=>{
        const w=deliveries[idx]||{};
        if(multiple&&!w.reuseStatus){if(i.reuseStatus)issues.push({code:'LEGACY_MULTI_WINNER',sourceId:`item:${i.id}:${idx}`});return;}
        const sourceId=`item:${i.id}:${idx}`;
        if(creditedThisItem>=amount(i.qty)){if(['sobra','realocado'].includes(status(w.reuseStatus||i.reuseStatus)))issues.push({code:'ITEM_CAP',sourceId});return;}
        const prior=returns.length;
        track(sourceId,multiple?w.reuseStatus:(w.reuseStatus||i.reuseStatus),!!(w.deliveredAt||(names.length===1&&i.deliveredAt)),Number(w.returnUnitsPerWinner)||size,w.reusedItemId||(!multiple?i.reusedItemId:'')||'',datePart(i.date));
        if(returns.length>prior)creditedThisItem++;
      });
    });
    // Resultados de promoção: precisa existir lançamento físico de Rádio no mesmo horário.
    const promoSeen=new Set();
    promos.forEach(p=>{
      if(!p?.id||p.distributionId!==id||String(p.segmentKey||'').toLowerCase()!=='ar'||promoSeen.has(p.id))return;
      promoSeen.add(p.id);
      const originals=unique.filter(i=>i.sourceType==='promo-result'&&i.promoId===p.id);
      const matched=new Map();
      originals.forEach(i=>{const key=`${i.date}|${normalizedTime(i.slot)}`;matched.set(key,(matched.get(key)||0)+amount(i.qty));});
      Object.entries(p.resultWinnersByHour||{}).forEach(([hourKey,winners])=>{
        const m=String(hourKey).match(/^(\d{4}-\d{2}-\d{2})-(\d{2})(\d{2})?$/);
        if(!m||m[1].slice(0,7)!==code)return;
        const originalCount=matched.get(`${m[1]}|${m[2]}${m[3]||'00'}`)||0;
        const listWinners=list(winners);
        if(originalCount===0){if(listWinners.some(w=>status(w?.reuseStatus)==='sobra'))issues.push({code:'NO_PHYSICAL_RESULT',sourceId:`promo:${p.id}:${hourKey}`});return;}
        let creditable=0;
        listWinners.forEach((w,idx)=>{
          if(!w||typeof w!=='object'||!w.name)return;
          const src=`promo:${p.id}:${hourKey}:${w.id||idx}`;
          if(creditable>=originalCount){if(status(w.reuseStatus)==='sobra')issues.push({code:'RESULT_CAP',sourceId:src});return;}
          const prev=returns.length;
          const units=Number(w.returnUnitsPerWinner||w.stockUnitsPerWinner)||requiredUnits;
          track(src,w.reuseStatus,!!w.deliveredAt,units,w.reusedItemId||'',m[1]);
          if(returns.length>prev)creditable++;
        });
      });
    });
    const credits=returns.length;
    const free=radioQuota+credits-programmed;
    const consumedCredits=Math.min(credits,Math.max(0,programmed-radioQuota));
    const physicalUnits=returns.reduce((n,r)=>n+r.physicalUnits,0);
    return {monthKey:code,distributionId:id,radioQuota,programmed,credits,available:free,physicalUnits,
      returnedAvailable:Math.max(0,credits-consumedCredits),returnedReallocated:consumedCredits,
      unit:returnUnit,unitsPerPrize:requiredUnits,returns,issues,inValidity};
  }
  const api=Object.freeze({compute,prizeUnits,unitSize});
  root.JPReturnBalance=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
