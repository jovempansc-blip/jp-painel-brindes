(function(root){
  'use strict';
  const upper=value=>String(value??'').trim().toUpperCase();
  const rows=value=>Array.isArray(value)?value.filter(Boolean):Object.values(value||{}).filter(Boolean);
  const copy=value=>JSON.parse(JSON.stringify(value));
  function validDate(value){
    return /^\d{4}-\d{2}-\d{2}$/.test(value||'')&&!Number.isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
  }
  function rangeFor(options){
    if(options.mode==='all')return {start:'',end:''};
    if(options.mode==='month'){
      if(!/^\d{4}-\d{2}$/.test(options.month||'')||!validDate(options.month+'-01'))throw new Error('SELECIONE UM MÊS VÁLIDO.');
      const [y,m]=options.month.split('-').map(Number);
      return {start:options.month+'-01',end:options.month+'-'+String(new Date(Date.UTC(y,m,0)).getUTCDate()).padStart(2,'0')};
    }
    const start=options.mode==='day'?options.day:options.start,end=options.mode==='day'?options.day:options.end;
    if(!validDate(start)||!validDate(end))throw new Error('INFORME UMA DATA VÁLIDA.');
    if(start>end)throw new Error('O PERÍODO FINAL NÃO PODE SER ANTERIOR AO INICIAL.');
    if(!['day','range'].includes(options.mode))throw new Error('SELECIONE O PERÍODO.');
    return {start,end};
  }
  function protection(item){
    if(!item?.id)return 'REGISTRO SEM IDENTIFICADOR';
    if(['REALIZADO','ENTREGUE'].includes(upper(item.status)))return 'SORTEIO REALIZADO';
    if(upper(item.status)==='CANCELADO')return 'JÁ CANCELADO';
    const values=[item.winnerName,item.resultName,item.resultAt,item.deliveredAt,item.deliveredBy,item.resultAtLabel,item.deliveredAtLabel];
    if(values.some(v=>String(v??'').trim())||rows(item.winnerNames).length||rows(item.winnerDeliveries).length||rows(item.resultWinners).length||rows(item.winners).length)return 'GANHADOR / RESULTADO PRESERVADO';
    if(item.sourceType==='promo-result'||item.promoId)return 'RESULTADO VINCULADO A PROMOÇÃO';
    return '';
  }
  function stable(value){
    if(Array.isArray(value))return value.map(stable);
    if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));
    return value;
  }
  function fingerprint(item){
    const out={};
    ['id','distributionId','date','slot','program','station','channel','sourceType','promoId','updatedAt','createdAt'].forEach(k=>out[k]=String(item[k]??''));
    out.status=upper(item.status)||'PENDENTE';
    ['qty','stockUnits','unitsPerWinner'].forEach(k=>out[k]=Number(item[k]||0));
    return JSON.stringify(stable(out));
  }
  function plan(data,options){
    const ids=new Set((options.distributionIds||[]).map(String)),range=rangeFor(options),all=[];
    Object.entries(data.months||{}).forEach(([monthKey,month])=>rows(month.items).forEach(item=>{
      if(ids.has(String(item.distributionId||'')))all.push({monthKey,item});
    }));
    const protectedIds=new Map();
    all.forEach(({item})=>{const reason=protection(item);if(reason&&item.id&&reason!=='JÁ CANCELADO')protectedIds.set(String(item.id),reason);});
    const inRange=date=>validDate(date)&&(!range.start||date>=range.start)&&(!range.end||date<=range.end);
    const selected=all.filter(({item})=>inRange(item.date)||!validDate(item.date)).map(row=>{
      const reason=protection(row.item)||protectedIds.get(String(row.item.id))||(!validDate(row.item.date)?'DATA INVÁLIDA · REVISE O CADASTRO':'');
      return {...row,reason,fingerprint:fingerprint(row.item)};
    }).sort((a,b)=>`${a.item.date||''}|${a.item.slot||''}|${a.monthKey}`.localeCompare(`${b.item.date||''}|${b.item.slot||''}|${b.monthKey}`));
    const removable=selected.filter(r=>!r.reason),preserved=selected.filter(r=>r.reason),promos=[];
    Object.entries(data.months||{}).forEach(([monthKey,month])=>rows(month.promos).forEach(p=>{
      if(!ids.has(String(p.distributionId||'')))return;
      const start=p.startDate||p.drawDate||'',end=p.endDate||p.drawDate||start;
      if(range.start&&end&&end<range.start)return;
      if(range.end&&start&&start>range.end)return;
      promos.push({monthKey,p});
    }));
    return {range,rows:selected,removable,protected:preserved,promos,dates:[...new Set(removable.map(r=>r.item.date))].sort(),units:removable.reduce((sum,r)=>sum+Math.max(0,Number(r.item.stockUnits||r.item.qty||0)),0)};
  }
  function applyMonth(month,candidates,operation){
    if(!month||typeof month!=='object')throw new Error('COMPETÊNCIA NÃO LOCALIZADA.');
    const next=copy(month),targets=new Map(candidates.map(row=>[String(row.item.id),row])),removed=[],skipped=[];
    next.items=rows(month.items).filter(item=>{
      const target=targets.get(String(item.id));if(!target)return true;
      const reason=protection(item)||(fingerprint(item)!==target.fingerprint?'REGISTRO ALTERADO EM OUTRO COMPUTADOR':'');
      if(reason){skipped.push({id:item.id,reason});return true;}
      removed.push(copy(item));return false;
    });
    next.unprogramHistory ||= {};
    const previous=next.unprogramHistory[operation.id];
    if(previous)return {month:copy(month),removed:[],skipped:[],alreadyApplied:true};
    next.unprogramHistory[operation.id]={...operation,removed,skipped};
    return {month:next,removed,skipped,alreadyApplied:false};
  }
  const api={plan,protection,fingerprint,applyMonth,rangeFor};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.JPDistributionUnprogram=api;
})(typeof globalThis==='object'?globalThis:window);
