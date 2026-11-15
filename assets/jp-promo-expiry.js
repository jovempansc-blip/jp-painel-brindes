/* JP Pilot: deterministic read-only stock release for expired, uncollected promotions. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.JPPromoExpiry=api;
})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const onlyDate=v=>{
  if(typeof v==='number'&&Number.isFinite(v))return new Date(v).toISOString().slice(0,10);
  return String(v||'').slice(0,10);
 };
 const parse=x=>{
  const date=onlyDate(x);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
  const d=new Date(date+'T12:00:00Z');
  return Number.isNaN(d.getTime())?null:d;
 };
 function deadline(value,days){
  const d=parse(value);if(!d)return '';
  const count=Math.max(1,Math.min(5,Math.floor(Number(days)||5)));
  let added=0;
  while(added<count){
   d.setUTCDate(d.getUTCDate()+1);
   const day=d.getUTCDay();
   if(day!==0&&day!==6)added++;
  }
  return d.toISOString().slice(0,10);
 }
 function winnersFor(p,o){
  const date=onlyDate(o?.date||p?.drawDate);
  const time=String(o?.time||p?.drawTime||'').replace(/\D/g,'').slice(0,4);
  const by=p?.resultWinnersByHour||{};
  let found=[];
  for(const [key,values] of Object.entries(by)){
   if(!Array.isArray(values))continue;
   const day=String(key).match(/^\d{4}-\d{2}-\d{2}/)?.[0]||'';
   const t=String(key).match(/-(\d{2})(\d{2})$/);
   const slot=t?t[1]+t[2]:'';
   if(day===date&&(!time||!slot||slot===time))found.push(...values);
  }
  if(found.length)return found;
  if(Object.keys(by).length)return [];
  if(date===onlyDate(p?.resultDate||p?.drawDate)){
   if(Array.isArray(p.resultWinners))return p.resultWinners;
   if(p.resultName)return String(p.resultName).split(',').map(name=>({name:name.trim()})).filter(w=>w.name);
  }
  return [];
 }
 function releasedUnits(p,o,today){
  if(String(o?.status||'').toUpperCase()!=='REALIZADO')return 0;
  const committed=Math.max(1,Number(o?.unitsPlanned)||Math.max(1,Number(o?.qtyPlanned||p?.winnersPerDraw||p?.qtyPerDraw)||1)*Math.max(1,Number(o?.unitsPerWinner||p?.unitsPerWinner)||1));
  const per=Math.max(1,Number(o?.unitsPerWinner||p?.unitsPerWinner)||1);
  const date=onlyDate(today);
  const days=Number(p?.pickupBusinessDays)||5;
  let expired=0;
  for(const w of winnersFor(p,o)){
   if(!w||w.deliveredAt||w.status==='RETIRADO')continue;
   const registered=w.registeredAt||w.registeredAtMs||p?.resultAt||o?.date||p?.resultDate||p?.drawDate;
   const d=deadline(registered,days);
   if(d&&date>d)expired+=per;
  }
  return Math.min(committed,expired);
 }
 return Object.freeze({deadline,winnersFor,releasedUnits});
});