const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
const studio=fs.readFileSync(path.join(root,'painel_pauta_estudio_jovem_pan_GITHUB_API.html'),'utf8');
const reception=fs.readFileSync(path.join(root,'preview_recepcao.html'),'utf8');
function section(src,begin,end){let a=src.indexOf(begin),b=src.indexOf(end,a);assert(a!==-1&&b>a,`bloco ${begin}`);return src.slice(a,b);}
const code=section(studio,'function studioAlertEligiblePromoResult(', '\nfunction buildStudioContext');
const campaign={id:'PROMO_A',kind:'promo',occurrences:[{date:'2026-10-17',time:'10:00',status:'AGENDADO'},{date:'2026-10-17',time:'00:00',status:'AGENDADO'}]};
const ctx={result:'',records:[], nowMinutes:21*60, schedule:slot=>slot==='10H'?'PROGRAMA VÁLIDO':'',campaign,console};
Object.assign(ctx,{todayISO:()=> '2026-10-17',normalizeStationValue:s=>s, STUDIO_STATION:'JP1017',slotParts:slot=>{const m=String(slot).match(/^(\d{1,2})(?:H|:)(\d{2})?$/);if(!m||+m[1]>23)return null;return {hour:+m[1],minute:+(m[2]||0)}},timeToHHMM:s=>{const m=String(s).match(/^(\d{1,2})(?:H|:)(\d{2})?$/);return m?String(+m[1]).padStart(2,'0')+':'+String(+(m[2]||0)).padStart(2,'0'):''},studioCampaignRecord:()=>ctx.campaign,studioCampaignVisible:()=>true,stationAllowed:()=>true,promoOccurrences:p=>p.occurrences,upper:s=>String(s||'').toUpperCase(),programFromSchedule:(date,slot)=>ctx.schedule(slot),studioPublishedPrizeItems:()=>ctx.records,promoResultVirtualRows:()=>[],formatStudioTime:s=>s,minutesOf:s=>{const p=ctx.slotParts(s);return p?p.hour*60+p.minute:-1},currentSlotDate:()=>({getHours:()=>Math.floor(ctx.nowMinutes/60),getMinutes:()=>ctx.nowMinutes%60}),esc:s=>String(s)});
vm.runInNewContext(code,ctx);
function row(overrides={}){return {id:'a',promoId:'PROMO_A',sourceType:'promo-result',date:'2026-10-17',slot:'00H',station:'JP1017',status:'PENDENTE',winnerName:'',program:'AS MAIS PEDIDAS',...overrides};}
// Bug previously reproduced: midnight row from invalid weekday program must not show.
ctx.records=[row()];assert.strictEqual(ctx.studioPromoResultDayAlert(),'');
// Missing slot must never be normalized to 00H.
ctx.records=[row({slot:''})];assert.strictEqual(ctx.studioPromoResultDayAlert(),'');
// Other date or station must never appear.
ctx.records=[row({date:'2026-10-16'}),row({station:'JPNEWS983'})];assert.strictEqual(ctx.studioPromoResultDayAlert(),'');
// Valid actual day program should appear, with official program name.
ctx.records=[row({slot:'10H',id:'valid'})];assert(ctx.studioPromoResultDayAlert().includes('PROGRAMA VÁLIDO'));
assert(!ctx.studioPromoResultDayAlert().includes('AS MAIS PEDIDAS'));
// Manual override represents an explicit appointment, not a stale virtual row.
ctx.records=[row({manualOverride:true,__virtualPromoResult:false})];assert(ctx.studioPromoResultDayAlert().includes('SORTEIO MANUAL'));
ctx.records=[row({manualOverride:true,__virtualPromoResult:true})];assert.strictEqual(ctx.studioPromoResultDayAlert(),'');
// Successful result no longer pending.
ctx.records=[row({slot:'10H',status:'REALIZADO',winnerName:'EXEMPLO'})];assert(ctx.studioPromoResultDayAlert().includes('RESULTADO REALIZADO'));

const recFns=[
 section(reception, 'function rowStatus(row){','\nfunction rowStatusClass'),
 section(reception,'function applyReceptionFilters(rows){','\nfunction receptionCurrentMonthRows'),
 section(reception,'function receptionCurrentMonthRows(rows){','\nfunction receptionCurrentMonthLabel'),
 section(reception,'function receptionCurrentMonthLabel(){','\nfunction renderReceptionStats'),
 section(reception,'function renderReceptionStats(rows){','\n\nfunction rowFromButton')
];
let fake={dateFilter:{value:'2026-10-17'},searchFilter:{value:''},receptionStats:{innerHTML:''}};
const rc={console,$:id=>fake[id],todayISO:()=> '2026-10-17',searchKey:v=>String(v).toUpperCase(),formatBR:v=>v,esc:v=>String(v),pickupPendingCount:rows=>rows.filter(x=>!x.deliveredAt&&!x.expired).length,receptionStatusFilter:'ALL',receptionDateScope:'month',isPickupPending:r=>!r.deliveredAt&&!r.expired};
vm.runInNewContext(recFns.join('\n'),rc);
const rows=[...Array(31)].map((_,i)=>({date:'2026-10-'+String(i%20+1).padStart(2,'0'),title:'PRÊMIO',result:'OUVINTE',deliveredAt:'',expired:false,deadlineClass:i===0?'today':i===1?'tomorrow':'ok'})).concat([...Array(38)].map((_,i)=>({date:'2026-10-05',deliveredAt:'2026-10-06',expired:false})),[...Array(6)].map((_,i)=>({date:'2026-10-07',deliveredAt:'',expired:true})),[{date:'2026-09-30',deliveredAt:''}]);
assert.strictEqual(rows.length,76);
const monthRows=rc.receptionCurrentMonthRows(rows);assert.strictEqual(monthRows.length,75);
rc.renderReceptionStats(rows);assert(fake.receptionStats.innerHTML.includes('TOTAL <strong>75</strong>'));
assert(fake.receptionStats.innerHTML.includes('PENDENTES <strong>31</strong>'));
assert.strictEqual(rc.applyReceptionFilters(monthRows).length,75);
rc.receptionStatusFilter='PENDENTE';assert.strictEqual(rc.applyReceptionFilters(monthRows).length,31);
rc.receptionStatusFilter='RETIRADO';assert.strictEqual(rc.applyReceptionFilters(monthRows).length,38);
rc.receptionStatusFilter='VENCIDO';assert.strictEqual(rc.applyReceptionFilters(monthRows).length,6);
// Date selection intentionally restricts day without confusing monthly TOTAL.
rc.receptionDateScope='day';rc.renderReceptionStats(rows);assert(fake.receptionStats.innerHTML.includes('DIA 2026-10-17'));
assert(!fake.receptionStats.innerHTML.includes('statChipBtn active" type="button" data-reception-filter="VENCIDO"'));
console.log('PASS AV58.1.27: 15 checks: studio weekday/00H/valid/manual/results; reception monthly 75, status and day');
