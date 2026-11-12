'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'assets/prog-manual.js'),'utf8');
const page=fs.readFileSync(path.join(root,'index.html'),'utf8');
const copy=v=>JSON.parse(JSON.stringify(v));
function extract(start,end){
 const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
 assert(a>=0&&b>a,'code region not found '+start);return src.slice(a,b);
}
const addSource=extract('  function manualSlotIsPast(', '  function showQtyDialog(');
const quantitySource=extract('  function confirmQty(){', '  function onEvents(){');
const saveSource=extract('  async function save(){', '  function enter(){');
const lockSource=extract('  const unsavedRetroDraft=',"  let mode='grade'");
let passed=0,failed=0,promises=[];
function test(label,fn){
 const onPass=()=>{passed++;console.log('PASS',passed,label)};
 const onFail=err=>{failed++;console.error('FAIL',label,err.stack||err)};
 try{const value=fn();if(value?.then)promises.push(value.then(onPass,onFail));else onPass();}
 catch(err){onFail(err)}
}
function insertionFixture({date='2026-11-11',current='2026-11-12',time='08H',quota=4,reason='PAINEL INDISPONÍVEL',approve=true,kind='prize',valid=true}={}){
 const d={id:'P_1',prize:'INGRESSO TESTE',title:'PAR DE INGRESSOS',total:8,ar:quota,
   startDate:valid?'2026-11-01':'2026-11-12',endDate:'2026-11-30'};
 const errors=[],calls=[],ui={jpManualQtyInput:{value:'1'}},holder={items:[],pautas:[],originalsMap:new Map()};
 const fakeNow=new Date('2026-11-12T10:30:00-03:00');
 const c={
   date,station:'JP1017',pending:null,draft:holder,Math,Number,Date,String,
   iso:()=>current,
   slotOrder:s=>({'08H':8,'10H':10,'11H':11,'15H':15,'18H':18})[s]??NaN,
   officialSlots:()=>['08H','10H','11H','15H','18H'],
   prizes:()=>valid?[d]:[],
   balance:()=>quota,
   state:{months:{[date.slice(0,7)]:{distributions:[d]}}},
   showQtyDialog:()=>calls.push('QTY'),
   reject:message=>{errors.push(String(message));return false},
   programFromSchedule:()=> 'PROGRAMA OFICIAL',
   paint:()=>calls.push('PAINT'),
   el:id=>ui[id]||null,
   dayName:()=> 'QUARTA',weekLabel:()=> '46',countryDate:v=>v.split('-').reverse().join('/'),
   distributionLabel:()=> 'INGRESSO TESTE',
   closeQty:()=>{c.pending=null;calls.push('CLOSE')},
   confirm:()=>approve,
   prompt:()=>reason,
   locked:()=>true,
   window:{prompt:()=>reason,confirm:()=>approve},
 };
 vm.createContext(c);vm.runInContext(addSource+quantitySource,c);
 return {ctx:c,d,errors,calls,run:(type=kind)=>c.add(type,'P_1',time),accept:()=>c.confirmQty()};
}
test('outdated script version is replaced to invalidate browser cache',()=>{
 assert(page.includes('assets/prog-manual.js?v=AV58_1_45_RETRO_DATAS_20261112'));
});
test('previous day 11/11 accepts new prize when today is 12/11',()=>{
 const f=insertionFixture();
 assert.equal(f.run(),true);assert.equal(f.ctx.pending.retroactive,true);
 assert.equal(f.calls[0],'QTY');
});
test('past date cannot include a pauta or a merchan',()=>{
 for(const kind of ['pauta','assigned-pauta','item']){
  const f=insertionFixture();
  assert.equal(f.run(kind),false);
  assert(f.errors[0].includes('DATAS PASSADAS'));
 }
});
test('past insertion creates PENDENTE with justification, original date and no winner',()=>{
 const f=insertionFixture();
 assert(f.run());f.accept();
 assert.equal(f.ctx.draft.items.length,1);
 const i=f.ctx.draft.items[0];
 assert.equal(i.date,'2026-11-11');
 assert.equal(i.manualRetroactive,true);
 assert.equal(i.manualCreated,true);
 assert.equal(i.manualRetroactiveReason,'PAINEL INDISPONÍVEL');
 assert(i.manualRetroactiveRegisteredAt);
 assert.equal(i.status,'PENDENTE');
 assert.equal(i.winnerName,undefined);
 assert.equal(i.resultAt,undefined);
 assert.equal(i.channel,'RÁDIO');
});
test('retroactive inclusion requires nonblank operator-provided reason',()=>{
 for(const reason of ['', '   ']){
  const f=insertionFixture({reason});
  assert(f.run());assert.equal(f.accept(),false);
  assert.equal(f.ctx.draft.items.length,0);
  assert(f.errors.some(x=>x.includes('MOTIVO')));
 }
});
test('cancelled confirmation creates no draft item',()=>{
 const f=insertionFixture({approve:false});
 assert(f.run());f.accept();
 assert.equal(f.ctx.draft.items.length,0);
});
test('future slots do not ask for retroactive justification',()=>{
 const f=insertionFixture({date:'2026-11-13',current:'2026-11-12'});
 assert(f.run());
 assert.equal(f.ctx.pending.retroactive,false);
 f.accept();assert.equal(f.ctx.draft.items[0].manualRetroactive,false);
});
test('past prize outside its date validity is not eligible',()=>{
 const f=insertionFixture({valid:false});
 assert.equal(f.run(),false);
 assert(f.errors.some(x=>x.includes('SEM SALDO')));
});
test('zero saldo blocks retroactive insertion',()=>{
 const f=insertionFixture({quota:0});
 assert.equal(f.run(),false);
 assert.equal(f.ctx.draft.items.length,0);
});
test('new retrospective draft can be corrected, but saved historical item stays locked',()=>{
 const c={draft:{originalsMap:new Map()},iso:()=> '2026-11-12',Date,slotOrder:()=>8};
 vm.createContext(c);vm.runInContext(lockSource,c);
 const item={id:'NEW',date:'2026-11-11',slot:'08H',status:'PENDENTE',manualRetroactive:true,manualCreated:true,sourceType:'manual'};
 const isLocked=vm.runInContext('locked',c);
 assert.equal(isLocked(item),false);
 c.draft.originalsMap.set(item.id,copy(item));
 assert.equal(isLocked(item),true);
 const realized={...item,id:'REALIZED',status:'REALIZADO',winnerName:'ALGUÉM'};
 assert.equal(isLocked(realized),true);
});
function makeSavedItem(overrides={}){
 return {id:'BRMAN_TEST_1',date:'2026-11-11',day:'QUARTA',slot:'08H',station:'JP1017',
  program:'LOCUTOR',distributionId:'P_1',prize:'INGRESSO TESTE',title:'INGRESSO TESTE',
  description:'',qty:1,channel:'RÁDIO',status:'PENDENTE',sourceType:'manual',
  manualOverride:true,manualCreated:true,manualRetroactive:true,
  manualRetroactiveReason:'FALHA NO PAINEL',manualRetroactiveRegisteredAt:'2026-11-12T10:00:00Z',
  createdAt:'2026-11-12T10:00:00Z',updatedAt:'2026-11-12T10:00:00Z',...overrides};
}
function saveFixture({newItem=makeSavedItem(),oldItems=[],pautas=[],quota=8,valid=true,remoteItemOverride=null}={}){
 const current='2026-11-12',date='2026-11-11',month='2026-11',station='JP1017';
 const distribution={id:'P_1',prize:'INGRESSO TESTE',title:'INGRESSO TESTE',
  startDate:valid?'2026-11-01':'2026-11-12',endDate:'2026-11-30',ar:quota,total:quota*2,ticketDefaultUnit:'pair'};
 const server={months:{[month]:{
  distributions:[distribution],items:copy(oldItems),promos:[],
  manualProgramHistory:[]
 }}};
 const before=copy(server);
 const newItems=(newItem===null?[]:[newItem]);
 let state={months:copy(server.months)};
 const originals=copy(oldItems);
 const draft={
  items:[...copy(originals),...copy(newItems)],
  originalItemJson:JSON.stringify(originals),
  originalsMap:new Map(originals.map(i=>[i.id,copy(i)])),
  pautas:copy(pautas),originalPautas:[],promoBaseline:new Map()
 };
 let errors=[],toasts=[],commitCount=0,attempts=0;
 const root={
  child(key){
   assert.equal(key,'months');
   return {child(monthKey){
    assert.equal(monthKey,month);
    return {
     get:async()=>({val:()=>copy(server.months[monthKey])}),
     transaction:async(update)=>{
      attempts++;
      const result=update(copy(server.months[monthKey]));
      if(!result)return {committed:false};
      server.months[monthKey]=copy(result);commitCount++;
      return {committed:true};
     }
    };
   }};
  }
 };
 const c={
  draft,state,date,station,Math,Number,JSON,Date,String,Map,Set,Promise,
  busy:false,firebaseConnected:true,firebaseServerLoaded:true,firebasePendingSave:false,
  firebaseReady:true,
  hasChanges:()=>true,
  paint:()=>{},window:{alert:m=>errors.push(String(m))},console:{...console,error:()=>{}},
  rows:v=>Array.isArray(v)?v.filter(Boolean):Object.values(v||{}).filter(Boolean),
  cloneJSON:copy,iso:()=>current,
  firebaseStateRootRef:()=>root,
  itemStation:i=>i.station||'JP1017',
  liveItem:i=>i?.channel==='RÁDIO'&&!['CANCELADO','CANCELADA'].includes(i.status),
  sameStation:(a,b)=>a===b,
  changedManualPromoIds:(before,after)=>[...new Set(after.map(x=>x.promoId))],
  alertCollision:(original,pautasBefore,remote)=>{
   const currentRows=remote.items.filter(i=>i.date===date&&i.station===station&&i.channel==='RÁDIO');
   return JSON.stringify(currentRows)===JSON.stringify(original)?'':'CONFLITO DE DADOS';
  },
  distStartDate:d=>d.startDate,distEndDate:d=>d.endDate,
  distributionLabel:d=>d.prize,
  qty:v=>Math.max(0,Number(v)||0),
  JPReturnBalance:{compute:()=>({radioQuota:quota,credits:0,returns:[]})},
  originalById:null,renderProgramacao:()=>{},snapshot:()=>({items:copy(server.months[month].items),originalsMap:new Map(),pautas:[]}),
  toast:message=>toasts.push(String(message)),
  slot:s=>s,
  firebaseNormalizeMonthValue:(k,v)=>copy(v)
 };
 vm.createContext(c);vm.runInContext(saveSource,c);
 return {run:async()=>{await c.save()},server,before,c,errors,toasts,get committed(){return commitCount},get attempts(){return attempts}};
}
test('Firebase simulated transaction records past-day prize and audit without winner',async()=>{
 const f=saveFixture();await f.run();
 assert.equal(f.committed,1,JSON.stringify(f.errors));
 const rows=f.server.months['2026-11'].items;
 assert.equal(rows.length,1);
 assert.equal(rows[0].date,'2026-11-11');
 assert.equal(rows[0].status,'PENDENTE');
 assert.equal(rows[0].winnerName,undefined);
 const hist=f.server.months['2026-11'].manualProgramHistory;
 assert.equal(hist.length,1);
 assert.equal(hist[0].source,'PROG_MANUAL_REGULARIZACAO_RETROATIVA');
 assert.equal(hist[0].retroactiveEntries.length,1);
 assert.equal(hist[0].retroactiveEntries[0].reason,'FALHA NO PAINEL');
 assert.equal(f.server.months['2026-11'].distributions[0].ar,8);
 assert(f.toasts.some(x=>x.includes('SALVA')));
});
test('historical insertion is blocked at commit if no reason',async()=>{
 const f=saveFixture({newItem:makeSavedItem({manualRetroactiveReason:''})});
 await f.run();
 assert.equal(f.committed,0);assert(f.errors.some(x=>x.includes('REGULARIZAÇÃO RETROATIVA INVÁLIDA')));
});
test('historical insertion is blocked at commit if disguised as regular prize',async()=>{
 const f=saveFixture({newItem:makeSavedItem({manualRetroactive:false})});
 await f.run();
 assert.equal(f.committed,0);assert(f.errors.some(x=>x.includes('APENAS NOVOS PRÊMIOS')));
});
test('historical insertion is blocked at commit if faking winner',async()=>{
 const f=saveFixture({newItem:makeSavedItem({winnerName:'TESTE',status:'REALIZADO'})});
 await f.run();
 assert.equal(f.committed,0);assert(f.errors.some(x=>x.includes('REGULARIZAÇÃO RETROATIVA INVÁLIDA')));
});
test('historical entry cannot change an already completed drawing',async()=>{
 const finished=makeSavedItem({id:'OLD_RESULT',status:'REALIZADO',manualCreated:false,manualRetroactive:false,winnerName:'GANHADOR EXISTENTE'});
 const f=saveFixture({oldItems:[finished],newItem:makeSavedItem({id:'NEW_2'})});
 f.c.draft.items[0].qty=2;
 await f.run();
 assert.equal(f.committed,0);
 assert.equal(f.server.months['2026-11'].items[0].winnerName,'GANHADOR EXISTENTE');
 assert.equal(f.server.months['2026-11'].items[0].qty,1);
});
test('historical insertion checks quota and rejects excess',async()=>{
 const f=saveFixture({newItem:makeSavedItem({qty:3}),quota:2});
 await f.run();
 assert.equal(f.committed,0);assert(f.errors.some(x=>x.includes('SALDO INSUFICIENTE')));
});
test('historical insertion rejects prize outside registered validity',async()=>{
 const f=saveFixture({valid:false});await f.run();
 assert.equal(f.committed,0);assert(f.errors.some(x=>x.includes('VIGÊNCIA ALTERADA')));
});
test('historical backfill does not modify prize physical stock, other results or another month',async()=>{
 const old=makeSavedItem({id:'OLD_RESULT',status:'REALIZADO',manualRetroactive:false,manualCreated:false,winnerName:'GANHADOR CONSERVADO'});
 const f=saveFixture({oldItems:[old],newItem:makeSavedItem({id:'NEW_2'})});
 await f.run();
 assert.equal(f.committed,1,JSON.stringify(f.errors));
 assert.equal(f.server.months['2026-11'].items[0].winnerName,'GANHADOR CONSERVADO');
 assert.equal(f.server.months['2026-11'].items.length,2);
 assert.equal(f.server.months['2026-11'].distributions[0].total,16);
});
test('historical insertion cannot change past pauta programming',async()=>{
 const f=saveFixture({pautas:[{key:'P_11',promoId:'PROMO',date:'2026-11-11',slot:'08H',station:'JP1017'}]});
 f.server.months['2026-11'].promos=[{id:'PROMO',name:'PAUTA TESTE'}];
 await f.run();
 assert.equal(f.committed,0);assert(f.errors.some(x=>x.includes('APENAS NOVOS PRÊMIOS')));
});
(async()=>{
 await Promise.all(promises);
 console.log('QA_PROG_MANUAL_RETRO_DATAS',passed,'PASS',failed,'FAIL');
 if(failed)process.exitCode=1;
})();

