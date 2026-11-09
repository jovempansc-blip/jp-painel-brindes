const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const engine=require('./return-balance.js');
const code=html.slice(html.indexOf('const RETURN_TRANSFER_SEGMENTS='),html.indexOf('function returnCountsByDistribution(){'));
assert(code.includes('function applyReturnTransferToMonth('));
const clone=x=>JSON.parse(JSON.stringify(x));
const num=x=>Math.max(0,Number(x)||0);
const size=x=>x==='pair'?2:1;
function dist(over={}){return {id:'D1',total:10,campaignStockTotal:10,ar:5,app:0,camarote:0,camarim:0,rua:0,rs:0,ticketDefaultUnit:'pair',ticketUnits:{ar:'pair',app:'unit',camarote:'pair',camarim:'unit',rua:'unit',rs:'pair'},startDate:'2026-11-01',endDate:'2026-11-30',...over}}
function original(over={}){return {id:'I1',date:'2026-11-02',slot:'09H',channel:'RÁDIO',station:'JP1017',sourceType:'manual',distributionId:'D1',qty:1,status:'REALIZADO',winnerName:'GANHADOR TESTE',reuseStatus:'sobra',...over}}
function month(d=dist(),i=original()){return {label:'NOVEMBRO',distributions:[d],items:[i],promos:[]}}
function rec(over={}){return {kind:'item',itemId:'I1',winnerIndex:0,winnerCount:1,winner:'GANHADOR TESTE',monthKey:'2026-11',distributionId:'D1',status:'sobra',...over}}
function context(d=dist()){
 const ctx={state:{currentMonth:'2026-11'},JPReturnBalance:engine,clone,num,Date,Math,Set,Object,Array,Number,JSON,String,Error,Promise,window:{},ticketUnit:(v,key)=>(v.ticketUnits||{})[key]||v.ticketDefaultUnit||'unit',allocated:d=>['ar','app','camarote','camarim','rua','rs'].reduce((n,k)=>n+num(d[k])*size(d.ticketUnits?.[k]||d.ticketDefaultUnit),0),distributionCampaignMasterTotal:d=>num(d.campaignStockTotal),todayISO:()=> '2026-11-09'};
 vm.createContext(ctx);vm.runInContext(code,ctx);
 return ctx;
}
function transfer(ctx,m,r=rec(),key='app',id='TR_TEST'){return vm.runInContext('applyReturnTransferToMonth',ctx)(m,r,key,id,'2026-11-09T10:00:00Z')}
let pass=0;
function run(name,fn){fn();pass++;console.log('PASS',name)}
run('1 pair returned to APP as 2 individual units, physical stock unchanged',()=>{let ctx=context(),m=month();let x=transfer(ctx,m);assert.equal(x.physicalUnits,2);assert.equal(x.targetQuantity,2);assert.equal(m.distributions[0].ar,4);assert.equal(m.distributions[0].app,2);assert.equal(m.distributions[0].total,10);assert.equal(m.distributions[0].campaignStockTotal,10);assert.equal(ctx.allocated(m.distributions[0]),10);assert.equal(m.items[0].returnTransferId,'TR_TEST')});
run('1 pair returned to CAMAROTE as exactly 1 pair',()=>{let ctx=context(),m=month();let x=transfer(ctx,m,rec(),'camarote');assert.equal(x.targetQuantity,1);assert.equal(m.distributions[0].camarote,1);assert.equal(m.distributions[0].ar,4);assert.equal(ctx.allocated(m.distributions[0]),10)});
run('1 pair returned to REDES SOCIAIS as exactly 1 pair',()=>{let ctx=context(),m=month();let x=transfer(ctx,m,rec(),'rs');assert.equal(x.targetQuantity,1);assert.equal(ctx.allocated(m.distributions[0]),10)});
run('1 pair returned to EXTERNA as 2 individuals',()=>{let ctx=context(),m=month();let x=transfer(ctx,m,rec(),'rua');assert.equal(x.targetQuantity,2);assert.equal(ctx.allocated(m.distributions[0]),10)});
run('same return cannot be transferred twice (idempotent source)',()=>{let ctx=context(),m=month();transfer(ctx,m);assert.throws(()=>transfer(ctx,m,rec(),'camarim','TR_2'),/JÁ UTILIZADA/);assert.equal(m.distributions[0].ar,4);assert.equal(m.distributions[0].app,2)});
run('return from old month blocked without silently moving inventory',()=>{let ctx=context(),m=month();assert.throws(()=>transfer(ctx,m,rec({monthKey:'2026-10'})),/COMPETÊNCIAS/);assert.equal(m.distributions[0].ar,5)});
run('expired prize held for reconciliation, no transfer',()=>{let d=dist({endDate:'2026-11-05'}),ctx=context(),m=month(d);assert.throws(()=>transfer(ctx,m),/VIGÊNCIA/);assert.equal(m.distributions[0].ar,5)});
run('delivered prize not credited',()=>{let ctx=context(),m=month(dist(),original({deliveredAt:'2026-11-08'}));assert.throws(()=>transfer(ctx,m),/ENTREGUE/);assert.equal(m.distributions[0].ar,5)});
run('radio quota 0 cannot transfer even if original returned',()=>{let d=dist({ar:0}),ctx=context(),m=month(d);assert.throws(()=>transfer(ctx,m),/COTA DO RÁDIO/)});
run('individual cannot become an incomplete pair',()=>{let d=dist({campaignStockTotal:5,total:5,ar:5,ticketDefaultUnit:'unit',ticketUnits:{ar:'unit',camarote:'pair'}});let ctx=context(),m=month(d);assert.throws(()=>transfer(ctx,m,rec(),'camarote'),/PAR INCOMPLETO/);assert.equal(m.distributions[0].ar,5)});
run('change destination requires valid code',()=>{let ctx=context(),m=month();assert.throws(()=>transfer(ctx,m,rec(),'reservado'),/INVÁLIDO/)});
run('not marked as SOBRA cannot transfer',()=>{let ctx=context(),m=month(dist(),original({reuseStatus:''}));assert.throws(()=>transfer(ctx,m),/NÃO CONFIRMADA/)});
run('multi-winner return credits exactly one winner, other stays untouched',()=>{let ctx=context(),i=original({id:'I2',qty:2,winnerName:'GANHADOR A, GANHADOR B',winnerNames:['GANHADOR A','GANHADOR B'],reuseStatus:undefined,winnerDeliveries:[{}, {reuseStatus:'sobra'}]}),m=month(dist({total:10,ar:5}),i);let x=transfer(ctx,m,rec({itemId:'I2',winnerIndex:1,winnerCount:2,winner:'GANHADOR B'}),'camarim');assert.equal(x.physicalUnits,2);assert.equal(m.items[0].winnerDeliveries[0].returnTransferId,undefined);assert.equal(m.items[0].winnerDeliveries[1].returnTransferId,'TR_TEST')});
run('source without exact winner match is rejected',()=>{let ctx=context(),m=month();assert.throws(()=>transfer(ctx,m,rec({winner:'OUTRA PESSOA'})),/GANHADOR ORIGINAL/)});
run('transfer creates a durable trace inside the distribution month',()=>{let ctx=context(),m=month();transfer(ctx,m);assert.equal(m.distributions[0].returnTransferJournal.length,1);assert.equal(m.distributions[0].returnTransferJournal[0].sourceId,'item:I1:0');assert.equal(m.distributions[0].returnTransferJournal[0].physicalUnits,2)});
run('promotion return linked to a physical radio result can transfer exactly once',()=>{
 const ctx=context(),d=dist();
 const item={id:'P_RESULT',sourceType:'promo-result',promoId:'P1',date:'2026-11-02',slot:'09H',channel:'RÁDIO',distributionId:'D1',qty:1,status:'REALIZADO'};
 const promo={id:'P1',distributionId:'D1',segmentKey:'ar',resultWinnersByHour:{'2026-11-02-0900':[{id:'W1',name:'GANHADOR TESTE',reuseStatus:'sobra'}]}};
 const m={label:'NOVEMBRO',items:[item],distributions:[d],promos:[promo]};
 const r={kind:'promo',promoId:'P1',occurrenceKey:'2026-11-02-0900',winnerIndex:0,winnerId:'W1',winner:'GANHADOR TESTE',monthKey:'2026-11',distributionId:'D1'};
 const result=transfer(ctx,m,r,'app');assert.equal(result.physicalUnits,2);assert.equal(m.promos[0].resultWinnersByHour['2026-11-02-0900'][0].returnTransferId,'TR_TEST');
 assert.equal(m.distributions[0].app,2);assert.equal(ctx.allocated(m.distributions[0]),10);
});
run('promo with missing physical radio result never creates credit',()=>{
 const ctx=context(),d=dist();const m={distributions:[d],items:[],promos:[{id:'P1',distributionId:'D1',segmentKey:'ar',resultWinnersByHour:{'2026-11-02-0900':[{id:'W1',name:'GANHADOR TESTE',reuseStatus:'sobra'}]}}]};
 const r={kind:'promo',promoId:'P1',occurrenceKey:'2026-11-02-0900',winnerIndex:0,winnerId:'W1',winner:'GANHADOR TESTE',monthKey:'2026-11',distributionId:'D1'};
 assert.throws(()=>transfer(ctx,m,r,'app'),/NÃO ESTÁ LIVRE/);assert.equal(m.distributions[0].app,0)
});
// Test the display function with a cross-month return even when current radio balance engine reports zero.
run('RETORNO table shows only compact per-registration count, independent of radio credit',()=>{
 const snippet=html.slice(html.indexOf('function returnCell(d,counts=null){'),html.indexOf('function activeBellNotifications(){'));
 const ctx={state:{currentMonth:'2026-11'},distributionReprogramStatus:()=>({credits:0,issues:[],returnedAvailable:0}),distributionVisualIds:()=>['D1'],returnCountsByDistribution:()=>({D1:{sobra:12,transferido:3,realocado:2}}),num,esc:s=>String(s)};
 vm.createContext(ctx);vm.runInContext(snippet,ctx);
 let rendered=vm.runInContext('returnCell',ctx)({id:'D1'});
 assert(rendered.includes('>17</button>'));assert(!rendered.includes('>12 SOBRAS'));assert(!rendered.includes('<small>'));assert(rendered.includes('12 SOBRA(S)'));
});
run('return ledger statuses remain separate from physical stock and winnings',()=>{assert(html.includes("r.status==='transferido'"));assert(html.includes('returnTransferId'));assert(html.includes('REAPROVEITAMENTO'));});
console.log('SUMMARY',pass,'/19 PASS');
