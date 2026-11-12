'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const begin=src.indexOf('function firebaseList(value){');
const end=src.indexOf('function hasLocalPersistedState(){',begin);
assert(begin>=0&&end>begin);
const normalizeStart=src.indexOf('function normalizePanelState(');
const normalizeEnd=src.indexOf('function monthData(){',normalizeStart);
assert(normalizeStart>0&&normalizeEnd>normalizeStart);
const code=src.slice(begin,end)+'\n'+src.slice(normalizeStart,normalizeEnd);
const copy=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
function fixture(){
 const rec=(month)=>({id:'D1',prize:'RÁDIO CELEBRATE',title:'PAR DE INGRESSOS',
  description:'Texto',date:'2026-10-09',startDate:'2026-10-09',endDate:'2026-11-19',
  snapshotMonth:month,total:90,campaignStockTotal:180,masterTotal:180,stockModelVersion:3,
  ar:month==='2026-11'?35:25,rua:month==='2026-11'?4:0,rs:month==='2026-11'?6:0,
  ticketDefaultUnit:'unit',ticketUnits:{ar:'pair',rua:'pair',rs:'pair'},stockLedger:[]});
 return {currentMonth:'2026-11',months:{
  '2026-10':{label:'OUTUBRO 2026',distributions:[rec('2026-10')],items:[{id:'I_OLD',status:'REALIZADO',winnerName:'NOME FICTÍCIO'}],promos:[]},
  '2026-11':{label:'NOVEMBRO 2026',distributions:[rec('2026-11')],items:[{id:'I_UNRELATED',status:'PENDENTE'}],promos:[]}
 },schedules:[],programSchedules:[],auditLog:[],trash:[],pendingOps:[],prizeCatalog:{},publishedPrograms:{},programVersions:{},systemMeta:{}};
}
function build(original){
 const server=copy(original),baseline=copy(original);
 let transactions=0,multiUpdates=0;
 function get(path){
  const bits=path.split('/').filter(Boolean);let obj=server;
  for(const part of bits)obj=obj==null?undefined:obj[part];
  return copy(obj);
 }
 function set(path,value){
  const bits=path.split('/').filter(Boolean);
  if(!bits.length)throw Error('Cannot replace entire mock Firebase root');
  let obj=server;
  for(const part of bits.slice(0,-1)){
    if(obj[part]===undefined)obj[part]={};
    obj=obj[part];
  }
  const last=bits[bits.length-1];
  if(value===null)delete obj[last];else obj[last]=copy(value);
 }
 class Ref{
  constructor(path){this.path=path;}
  child(path){return new Ref(this.path?this.path+'/'+path:path);}
  async once(){return {val:()=>get(this.path)};}
  async set(value){set(this.path,value);return true;}
  async transaction(handler){
   transactions++;const current=get(this.path);
   const updated=handler(current);if(updated===undefined)throw Error('ABORTED TRANSACTION');
   set(this.path,updated);return {committed:true};
  }
  async update(values){
   if(this.path==='months')multiUpdates++;
   for(const [k,v] of Object.entries(values))set((this.path?this.path+'/':'')+k,v);
   return true;
  }
 }
 const context={
  firebaseBaselineState:baseline,
  firebaseStateRootRef:()=>new Ref(''),window:{firebase:{database:{ServerValue:{TIMESTAMP:1773241234}}}},
  emptyWorkspaceState:()=>fixture(),clone:copy,Math,Number,JSON,Date,Map,Set,Object,String,
  num:x=>Math.max(0,Number(x)||0),norm:x=>String(x||'').trim(),textNorm:x=>String(x||'').trim(),
  normalizeReservationEntries:d=>Array.isArray(d.reservas)?d.reservas:[],
  reservationPackageTotal:d=>Array.isArray(d.reservas)?d.reservas.reduce((n,r)=>n+(Number(r.qty)||0),0):0,
  reservationConsumed:d=>Array.isArray(d.reservas)?d.reservas.reduce((n,r)=>n+(Number(r.qty)||0)*(r.unit==='pair'?2:1),0):0,
  WINNER_TRASH_RETENTION_DAYS:120,WINNER_PROGRAM_VERSION_LIMIT:10,
  hydrateLegacyDistributionSnapshots:()=>0,
  normalizeStatus:x=>x,normalizeChannel:x=>x,
 };
 vm.createContext(context);vm.runInContext(code,context);
 return {context,server,get,stats:()=>({transactions,multiUpdates})};
}
let passed=0,failed=0;
const pending=[];
function test(label,fn){
 const ok=()=>{console.log('PASS',++passed,label);};
 const fail=e=>{failed++;console.error('FAIL',label,e.stack||e);};
 try{const v=fn();if(v&&typeof v.then==='function')pending.push(v.then(ok,fail));else ok();}catch(e){fail(e);}
}
test('multi-month stock update saves 20 units in one atomic months patch',async()=>{
 const f=build(fixture()),snap=copy(f.server);
 const ledger={id:'STK_1',kind:'ADDITION',distId:'D1',monthKey:'2026-11',physicalDelta:20,monthDelta:20,origin:'LOTE TESTE',createdAt:'2026-11-11T10:00:00Z'};
 for(const m of Object.values(snap.months)){m.distributions[0].campaignStockTotal=200;m.distributions[0].masterTotal=200;m.distributions[0].stockLedger=[copy(ledger)];}
 snap.months['2026-11'].distributions[0].total=110;
 snap.auditLog.push({id:'AUDIT_1',action:'RECEBIMENTO ADICIONAL'});
 await f.context.persistGranularState(snap);
 assert.equal(f.stats().multiUpdates,1);
 assert.equal(f.server.months['2026-11'].distributions[0].total,110);
 assert.equal(f.server.months['2026-10'].distributions[0].total,90);
 assert.equal(f.server.months['2026-10'].distributions[0].campaignStockTotal,200);
 assert.equal(f.server.months['2026-11'].distributions[0].campaignStockTotal,200);
 assert.equal(f.server.months['2026-10'].distributions[0].stockLedger[0].id,'STK_1');
 assert.equal(f.server.months['2026-11'].distributions[0].stockLedger[0].id,'STK_1');
 assert.equal(f.server.months['2026-10'].items[0].winnerName,'NOME FICTÍCIO');
 assert.equal(f.server.auditLog.length,1);
});
test('editing only November channel values persists without overwriting October',async()=>{
 const f=build(fixture()),snap=copy(f.server);
 snap.months['2026-11'].distributions[0].ar=36;
 snap.months['2026-11'].distributions[0].rs=5;
 await f.context.persistGranularState(snap);
 assert.equal(f.stats().multiUpdates,0);
 assert.equal(f.server.months['2026-11'].distributions[0].ar,36);
 assert.equal(f.server.months['2026-11'].distributions[0].rs,5);
 assert.equal(f.server.months['2026-10'].distributions[0].ar,25);
 assert.equal(f.server.months['2026-11'].items[0].id,'I_UNRELATED');
});
test('metadata changes across two months preserve winner and program items',async()=>{
 const f=build(fixture()),snap=copy(f.server);
 for(const month of Object.values(snap.months)){month.distributions[0].title='NOVO TÍTULO';month.distributions[0].description='NOVA DESCRIÇÃO';}
 await f.context.persistGranularState(snap);
 assert.equal(f.stats().multiUpdates,1);
 assert.equal(f.server.months['2026-10'].distributions[0].title,'NOVO TÍTULO');
 assert.equal(f.server.months['2026-11'].distributions[0].description,'NOVA DESCRIÇÃO');
 assert.equal(f.server.months['2026-10'].items[0].status,'REALIZADO');
});
test('concurrent remote change to the same distribution rejects stale write',async()=>{
 const f=build(fixture()),snap=copy(f.server);
 snap.months['2026-11'].distributions[0].ar=36;
 f.server.months['2026-11'].distributions[0].title='OUTRO OPERADOR ALTEROU';
 await assert.rejects(f.context.persistGranularState(snap),/CONFLITO DE EDIÇÃO/);
 assert.equal(f.server.months['2026-11'].distributions[0].ar,35);
 assert.equal(f.server.months['2026-11'].distributions[0].title,'OUTRO OPERADOR ALTEROU');
});
test('legacy RTDB record without optional reservations persists an increase from 20 to 40',async()=>{
 const original=fixture();
 const raw=original.months['2026-11'].distributions[0];
 raw.total=20;raw.campaignStockTotal=20;raw.masterTotal=20;raw.ar=10;raw.rs=0;raw.rua=0;
 delete raw.reservas;delete raw.reservadoReal;delete raw.originMonth;delete raw.snapshotMonth;
 raw.ticketDefaultUnit='pair';raw.ticketUnits={ar:'pair',reservado:'mixed'};
 const f=build(original);
 // The client normalizes Firebase's raw record on bootstrap, just like production.
 const baseline=f.context.normalizePanelState(copy(f.server),{hydrateSnapshots:false});
 f.context.firebaseBaselineState=baseline;
 const saved=copy(baseline);
 const target=saved.months['2026-11'].distributions[0];
 target.total=40;target.campaignStockTotal=40;target.masterTotal=40;target.ar=20;
 target.stockLedger=[{id:'STK_1',kind:'ADDITION',physicalDelta:20,monthDelta:20,origin:'LOTE TESTE'}];
 await f.context.persistGranularState(saved);
 const persisted=f.server.months['2026-11'].distributions[0];
 assert.equal(persisted.total,40);
 assert.equal(persisted.campaignStockTotal,40);
 assert.equal(persisted.ar,20);
 assert.equal(persisted.stockLedger.length,1);
 // Raw legacy data should not be erased just to normalize optional properties.
 assert.equal(f.server.months['2026-10'].items[0].status,'REALIZADO');
 assert.equal(f.stats().transactions>=1,true);
});
test('legacy record conflict still rejects real concurrent modification of title',async()=>{
 const original=fixture();
 delete original.months['2026-11'].distributions[0].reservas;
 const f=build(original);
 const baseline=f.context.normalizePanelState(copy(f.server),{hydrateSnapshots:false});
 f.context.firebaseBaselineState=baseline;
 const saved=copy(baseline);
 saved.months['2026-11'].distributions[0].ar=36;
 f.server.months['2026-11'].distributions[0].title='ALTERAÇÃO DE OUTRA ESTAÇÃO';
 await assert.rejects(f.context.persistGranularState(saved),/CONFLITO DE EDIÇÃO/);
 assert.equal(f.server.months['2026-11'].distributions[0].ar,35);
 assert.equal(f.server.months['2026-11'].distributions[0].title,'ALTERAÇÃO DE OUTRA ESTAÇÃO');
});
test('REGRESSAO: recebimento em campanha outubro-novembro com dados legados',async()=>{
 const raw=fixture();
 for(const m of Object.values(raw.months)){
   const d=m.distributions[0];
   delete d.reservas;delete d.reservadoReal;delete d.originMonth;
   delete d.snapshotMonth;delete d.monthlyInitialTotal;
 }
 const f=build(raw);
 const baseline=f.context.normalizePanelState(copy(f.server),{hydrateSnapshots:false});
 f.context.firebaseBaselineState=baseline;
 const next=copy(baseline);
 for(const m of Object.values(next.months)){
   m.distributions[0].campaignStockTotal=200;
   m.distributions[0].masterTotal=200;
   m.distributions[0].stockLedger=[{id:'STK_GEN',kind:'ADDITION',monthKey:'2026-11',physicalDelta:20,monthDelta:20}];
 }
 next.months['2026-11'].distributions[0].total=110;
 await f.context.persistGranularState(next);
 assert.equal(f.server.months['2026-11'].distributions[0].total,110);
 assert.equal(f.server.months['2026-10'].distributions[0].total,90);
 assert.equal(f.server.months['2026-10'].distributions[0].campaignStockTotal,200);
 assert.equal(f.server.months['2026-10'].items[0].winnerName,'NOME FICTÍCIO');
});
test('recebimento em campanha de tres competencias preserva cotas anteriores',async()=>{
 const raw=fixture();
 raw.months['2026-09']=copy(raw.months['2026-10']);
 raw.months['2026-09'].label='SETEMBRO 2026';
 for(const m of Object.values(raw.months)){
   const d=m.distributions[0];delete d.reservas;delete d.snapshotMonth;
   d.campaignStockTotal=270;d.masterTotal=270;d.total=90;
 }
 const f=build(raw);
 const baseline=f.context.normalizePanelState(copy(f.server),{hydrateSnapshots:false});
 f.context.firebaseBaselineState=baseline;
 const next=copy(baseline);
 for(const m of Object.values(next.months)){
   m.distributions[0].campaignStockTotal=300;m.distributions[0].masterTotal=300;
   m.distributions[0].stockLedger=[{id:'STK_3M',kind:'ADDITION',physicalDelta:30,monthDelta:30}];
 }
 next.months['2026-11'].distributions[0].total=120;
 await f.context.persistGranularState(next);
 assert.equal(f.server.months['2026-09'].distributions[0].total,90);
 assert.equal(f.server.months['2026-10'].distributions[0].total,90);
 assert.equal(f.server.months['2026-11'].distributions[0].total,120);
 assert.equal(f.server.months['2026-10'].distributions[0].campaignStockTotal,300);
 assert.equal(f.server.months['2026-09'].distributions[0].stockLedger[0].id,'STK_3M');
});
test('premio independente nao sofre alteracoes ao salvar outro premio',async()=>{
 const raw=fixture();
 for(const m of Object.values(raw.months)){
   const d=m.distributions[0];delete d.reservas;
   m.distributions.push({...copy(d),id:'OUTRO_PREMIO',prize:'OUTRO PRÊMIO',total:12,campaignStockTotal:24,ar:6});
 }
 const otherBefore=copy(raw.months['2026-11'].distributions[1]);
 const f=build(raw);
 const baseline=f.context.normalizePanelState(copy(f.server),{hydrateSnapshots:false});
 f.context.firebaseBaselineState=baseline;const next=copy(baseline);
 for(const m of Object.values(next.months)){
   m.distributions[0].campaignStockTotal=200;m.distributions[0].masterTotal=200;
 }
 next.months['2026-11'].distributions[0].total=110;
 await f.context.persistGranularState(next);
 assert.equal(f.server.months['2026-11'].distributions[1].total,otherBefore.total);
 assert.equal(f.server.months['2026-10'].distributions[1].campaignStockTotal,otherBefore.campaignStockTotal);
});
test('brinde individual em campanha multimês tambem permite atualizacao',async()=>{
 const raw=fixture();
 for(const m of Object.values(raw.months)){
   const d=m.distributions[0];d.prizeType='brinde';d.ticketDefaultUnit='unit';
   d.ticketUnits={ar:'unit'};delete d.reservas;delete d.snapshotMonth;
 }
 const f=build(raw);
 const baseline=f.context.normalizePanelState(copy(f.server),{hydrateSnapshots:false});
 f.context.firebaseBaselineState=baseline;const next=copy(baseline);
 for(const m of Object.values(next.months)){
   m.distributions[0].campaignStockTotal=230;m.distributions[0].masterTotal=230;
 }
 next.months['2026-11'].distributions[0].total=140;
 await f.context.persistGranularState(next);
 assert.equal(f.server.months['2026-11'].distributions[0].total,140);
 assert.equal(f.server.months['2026-10'].distributions[0].total,90);
});
test('modificacao real concorrente em premio multimês permanece bloqueada',async()=>{
 const raw=fixture();
 for(const m of Object.values(raw.months))delete m.distributions[0].reservas;
 const f=build(raw);
 const baseline=f.context.normalizePanelState(copy(f.server),{hydrateSnapshots:false});
 f.context.firebaseBaselineState=baseline;const next=copy(baseline);
 for(const m of Object.values(next.months))m.distributions[0].campaignStockTotal=200;
 next.months['2026-11'].distributions[0].total=110;
 f.server.months['2026-10'].distributions[0].title='TITULO ALTERADO POR OUTRA ESTAÇÃO';
 await assert.rejects(f.context.persistGranularState(next),/CONFLITO DE EDIÇÃO/);
 assert.equal(f.server.months['2026-10'].distributions[0].title,'TITULO ALTERADO POR OUTRA ESTAÇÃO');
 assert.equal(f.server.months['2026-11'].distributions[0].total,90);
});


test('repeating same snapshot does not duplicate history',async()=>{
 const f=build(fixture()),snap=copy(f.server);
 snap.months['2026-11'].distributions[0].ar=36;
 await f.context.persistGranularState(snap);
 await f.context.persistGranularState(snap);
 assert.equal(f.server.months['2026-11'].distributions[0].ar,36);
});
(async()=>{await Promise.all(pending);console.log('GRANULAR-RTDB',passed,'PASS',failed,'FAIL');if(failed)process.exitCode=1;})();

