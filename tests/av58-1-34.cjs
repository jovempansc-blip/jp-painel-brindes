const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const text=(a,b)=>{const start=html.indexOf(a),end=html.indexOf(b,start);assert(start>=0&&end>start,`${a} not found`);return html.slice(start,end);};
// Physical stock and monthly quotas are independent unless the operator explicitly selects the monthly allocation.
const stock={distributionCampaignMasterTotal:d=>d.campaignStockTotal,num:x=>Number(x)||0,Math,Number};
vm.createContext(stock);vm.runInContext(text('function distributionStockUpdateProposal(','function updateDistStockChangePreview('),stock);
const original={campaignStockTotal:100,total:30};
let out=stock.distributionStockUpdateProposal(original,30,115,'global');
assert.equal(out.masterTotal,115);assert.equal(out.monthTotal,30);assert.equal(out.increase,15);
out=stock.distributionStockUpdateProposal(original,30,115,'current');
assert.equal(out.masterTotal,115);assert.equal(out.monthTotal,45);
out=stock.distributionStockUpdateProposal(original,40,115,'current');
assert.equal(out.monthTotal,40,'explicit monthly total must not receive the delta twice');
assert.throws(()=>stock.distributionStockUpdateProposal(original,30,90,'current'),/EXCLUSIVA PARA AUMENTO/);
assert(html.includes('await flushFirebaseNow(\'ALTERAÇÃO DE ESTOQUE E DISTRIBUIÇÃO\')'));
assert(html.includes('distributionFormSaving=true'));
assert(html.includes('CONFIRMAR ALTERAÇÃO DE ESTOQUE?'));
// Result rows from past and confirmed draws remain byte-for-byte identical.
const previous={id:'OLD',date:'2026-10-18',slot:'08:00',station:'JP1017',sourceType:'promo-result',promoId:'P1',status:'REALIZADO',winnerName:'GANHADOR FICTÍCIO',deliveredAt:'2026-10-18',segmentKey:'ar'};
const confirmed={id:'CONF',date:'2026-10-22',slot:'08:00',station:'JP1017',sourceType:'promo-result',promoId:'P1',status:'REALIZADO',winnerName:'OUTRO FICTÍCIO',deliveredAt:'2026-10-22',segmentKey:'ar'};
const future={id:'FUTURE',date:'2026-10-20',slot:'08:00',station:'JP1017',sourceType:'promo-result',promoId:'P1',status:'PENDENTE',segmentKey:'ar',occurrenceId:'OLD_O1'};
const orphan={id:'ORPHAN',date:'2026-10-21',slot:'08:00',station:'JP1017',sourceType:'promo-result',promoId:'P1',status:'PENDENTE'};
const unrelated={id:'U1',date:'2026-10-20',slot:'08:00',station:'JP1017',sourceType:'promo-result',promoId:'OTHER',status:'PENDENTE'};
const state={months:{'2026-10':{items:[previous,confirmed,future,orphan,unrelated]},'2026-11':{items:[]}}};
let ids=0;
const ctx={state,Date,Math,Number,Map,Array,Object,Set,
  todayISO:()=> '2026-10-19',existingPromoResultItems:id=>Object.entries(state.months).flatMap(([monthKey,m])=>m.items.filter(i=>i.promoId===id).map(item=>({monthKey,item}))),
  normalizeStatus:x=>x,generatePromoOccurrences:p=>p.occurrences,promoResultStations:p=>[p.station],
  timeToHHMM:x=>x,normalizeSlot:x=>x,monthDataForKey:key=>state.months[key],
  id:()=>`NEW_${++ids}`,norm:x=>String(x||'').trim(),num:x=>Number(x)||0,
  dayName:()=> 'DIA',weekLabel:()=> 'SEMANA',DESTINATION_LABELS:{ar:'RÁDIO',rs:'REDES SOCIAIS'},
  promoResultProgramTitle:()=> 'PROGRAMADO',promoOccurrenceKey:(p,d,t)=>`${p.id}|${d}|${t}`,
  promoOccurrenceStockUnits:()=>2,defaultPromoTextStyle:()=>({})
};
vm.createContext(ctx);
vm.runInContext(text('function promoResultItemHasOutcome(','function readHourKeyForAdmin('),ctx);
const beforePrev=JSON.stringify(previous),beforeConf=JSON.stringify(confirmed);
const promo={id:'P1',name:'CAMPANHA',kind:'promo',segmentKey:'rs',distributionId:'D1',station:'JP1017',local:'INSTAGRAM',unitsPerWinner:2,occurrences:[
 {date:'2026-10-20',time:'08:00',id:'A',qtyPlanned:2},{date:'2026-10-22',time:'08:00',id:'B',qtyPlanned:1},
 {date:'2026-11-03',time:'10:00',id:'C',qtyPlanned:1}
]};
let stats=ctx.syncPromoResultToProgram(promo);
assert.deepEqual(JSON.stringify(previous),beforePrev);assert.deepEqual(JSON.stringify(confirmed),beforeConf);
assert.equal(stats.updated,1);assert.equal(stats.removed,1);assert.equal(stats.added,1);
assert.equal(future.segmentKey,'rs');assert.equal(future.id,'FUTURE');
assert.equal(state.months['2026-10'].items.some(i=>i.id==='ORPHAN'),false);
assert.equal(state.months['2026-10'].items.some(i=>i.id==='U1'),true);
assert.equal(state.months['2026-11'].items[0].segmentKey,'rs');
// Second reconciliation is idempotent.
stats=ctx.syncPromoResultToProgram(promo);assert.equal(stats.added,0);assert.equal(stats.removed,0);
assert.equal(state.months['2026-11'].items.length,1);
assert(html.includes('storePromoAcrossMonths(p,state.currentMonth,isNewPromoRecord);'));
assert(html.includes('if(isPromo)syncPromoResultToProgram(p);'));
console.log('PASS AV58.1.34: estoque global vs cota, confirmação, preservação do histórico, reconciliação multimês e idempotência');
