'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const start=source.indexOf('// JP A08 - leitura preliminar');
const end=source.indexOf('\nfunction initFirebaseSync(){',start);
assert(start>0&&end>start,'Candidate staged boot must exist');
const program=source.slice(start,end);
let n=0;
async function test(name,fn){await fn();console.log('PASS',++n,name)}
const copy=x=>x==null?x:JSON.parse(JSON.stringify(x));
function makeScenario({legacy=false,failAudit=false,holdAudit=false}={}){
 const months={'2026-11':{label:'2026-11',distributions:[
   {id:'D1',title:'INGRESSOS TESTE 1',endDate:'2026-11-30'},
   {id:'D2',title:'INGRESSOS TESTE 2',endDate:'2026-11-18'},
   {id:'D3',title:'INGRESSOS ENCERRADOS',endDate:'2026-11-01'}
 ]},'2026-10':{label:'2026-10',distributions:[{id:'D4',title:'OUTUBRO'}]}};
 const official={months,auditLog:[{id:'LOG1',action:'REGISTRO FICTÍCIO'}],currentMonth:'2026-11',prizeCatalog:{PRIZE:{title:'PRIZE'}},savedAt:'2026-11-17T00:00:00.000Z'};
 const root=legacy?{state:official}:{...official};
 const requested=[],status=[],ui={monthInput:{value:'2026-11'},distCompactTable:{innerHTML:''},distTable:{innerHTML:''},distSearchInput:{value:''}};
 let releaseAudit;
 const barrier=holdAudit?new Promise(resolve=>{releaseAudit=resolve}):null;
 const lookup=p=>p.reduce((obj,key)=>obj?.[key],root);
 const ref=(parts=[])=>({
   child(key){return ref([...parts,String(key)])},
   async get(){
     requested.push(parts.join('/')||'ROOT');
     if(failAudit&&parts.join('/')==='auditLog')throw Error('SIMULATED AUDIT READ FAILURE');
     if(barrier&&parts.join('/')==='auditLog')await barrier;
     return{val:()=>copy(lookup(parts))};
   }
 });
 const ctx={
  Promise,Object,Array,String,Date,Math,Error,console,
  state:{currentMonth:'2026-11',months:{}},activeView:'distribuicao',distributionLifecycleFilter:'active',
  $:name=>ui[name]||null,norm:x=>String(x||'').toUpperCase(),esc:x=>String(x||'').replace(/&/g,'&amp;').replace(/</g,'&lt;'),
  formatBR:x=>x||'',distEndDate:d=>d.endDate,distributionLabel:d=>d.title,
  currentCalendarMonth:()=> '2026-11',
  distributionLifecycleStatusForMonth:d=>({key:d.endDate<'2026-11-17'?'ended':'active'}),
  firebaseList:v=>Array.isArray(v)?v.filter(Boolean):Object.values(v||{}).filter(Boolean),
  firebaseRef:ref(),firebaseServerLoaded:false,firebaseConnected:false,firebaseReady:true,
  firebaseBootstrapInFlight:false,firebaseBootstrapPromise:null,firebasePendingSave:false,
  firebaseDatabase:{goOnline(){status.push('GOONLINE')}},
  firebaseRetryTimer:0,
  updateSyncStatus:(mode,message)=>status.push(mode+':'+message),
  firebaseApplySnapshot:(snap)=>{ctx.lastPayload=snap.val();ctx.firebaseServerLoaded=true;ctx.state=copy(ctx.lastPayload?.state||ctx.lastPayload);},
  firebaseMarkServerActivity:()=>status.push('PROBE'),
  startGranularFirebaseListeners:()=>status.push('START_LISTENERS'),
  scheduleFirebaseRetry:()=>status.push('RETRY'),
  queueApiSave:()=>status.push('QUEUE_SAVE'),
  clearTimeout:()=>{},
  jpFirebaseNow:()=>1,jpFirebaseMeasure:()=>status.push('METRIC'),
  navigator:{onLine:true},
 };
 vm.createContext(ctx);vm.runInContext(program,ctx);
 return {ctx,ui,status,requested,official,root,releaseAudit};
}
(async()=>{
 await test('previsualiza cadastros oficiais do mês sem carregar histórico inteiro',async()=>{
   const x=makeScenario();await x.ctx.firebasePrimeCurrentDistributions();
   assert.equal(x.ctx.firebaseServerLoaded,false);
   assert(x.ui.distCompactTable.innerHTML.includes('INGRESSOS TESTE 1'));
   assert(x.ui.distCompactTable.innerHTML.includes('INGRESSOS TESTE 2'));
   assert(!x.ui.distCompactTable.innerHTML.includes('INGRESSOS ENCERRADOS'));
 });
 await test('preview não modifica o estado operacional oficial nem o baseline',async()=>{
   const x=makeScenario();await x.ctx.firebasePrimeCurrentDistributions();
   assert.equal(Object.keys(x.ctx.state.months).length,0);
   assert(!x.ctx.firebaseBaselineState);
 });
 await test('preview é exclusivamente de leitura, sem botões de edição',async()=>{
   const x=makeScenario();await x.ctx.firebasePrimeCurrentDistributions();
   const html=x.ui.distCompactTable.innerHTML;
   assert(html.includes('SOMENTE CONSULTA'));assert(!html.includes('<button'));assert(!html.includes('<input'));
 });
 await test('preview respeita filtro TODOS',async()=>{
   const x=makeScenario();await x.ctx.firebasePrimeCurrentDistributions();
   x.ctx.distributionLifecycleFilter='all';x.ctx.renderFirebaseDistributionPreview();
   assert(x.ui.distCompactTable.innerHTML.includes('INGRESSOS ENCERRADOS'));
 });
 await test('preview respeita busca digitada',async()=>{
   const x=makeScenario();await x.ctx.firebasePrimeCurrentDistributions();
   x.ui.distSearchInput.value='TESTE 1';x.ctx.renderFirebaseDistributionPreview();
   assert(x.ui.distCompactTable.innerHTML.includes('INGRESSOS TESTE 1'));
   assert(!x.ui.distCompactTable.innerHTML.includes('INGRESSOS TESTE 2'));
 });
 await test('bootstrap completo mantém todos os meses e auditoria',async()=>{
   const x=makeScenario();const ok=await x.ctx.firebaseBootstrapRead(true);
   assert.equal(ok,true);assert.equal(x.ctx.firebaseServerLoaded,true);
   assert.equal(Object.keys(x.ctx.state.months).length,2);
   assert.equal(x.ctx.state.auditLog.length,1);
   assert.equal(x.ctx.state.prizeCatalog.PRIZE.title,'PRIZE');
 });
 await test('não transfere a raiz inteira em uma consulta de 33 MB',async()=>{
   const x=makeScenario();await x.ctx.firebaseBootstrapRead();
   assert(!x.requested.includes('ROOT'));assert(x.requested.includes('auditLog'));assert(x.requested.includes('months'));
 });
 await test('distribuições continuam somente em leitura até auditoria chegar',async()=>{
   const x=makeScenario({holdAudit:true});
   const pending=x.ctx.firebaseBootstrapRead();
   await new Promise(resolve=>setImmediate(resolve));
   assert.equal(x.ctx.firebaseServerLoaded,false);
   assert(x.ui.distCompactTable.innerHTML.includes('SOMENTE CONSULTA'));
   x.releaseAudit();assert.equal(await pending,true);
   assert.equal(x.ctx.firebaseServerLoaded,true);
 });
 await test('duas chamadas concorrentes não repetem o download dos meses',async()=>{
   const x=makeScenario({holdAudit:true});
   const first=x.ctx.firebaseBootstrapRead(true),second=x.ctx.firebaseBootstrapRead(true);
   await new Promise(resolve=>setImmediate(resolve));
   assert.equal(x.requested.filter(q=>q==='months').length,1);
   x.releaseAudit();await Promise.all([first,second]);
   assert.equal(x.requested.filter(q=>q==='auditLog').length,1);
 });
 await test('listeners são iniciados somente após hidratação completa',async()=>{
   const x=makeScenario({holdAudit:true});const pending=x.ctx.firebaseBootstrapRead();
   await new Promise(resolve=>setImmediate(resolve));
   assert(!x.status.includes('START_LISTENERS'));
   x.releaseAudit();await pending;assert(x.status.includes('START_LISTENERS'));
 });
 await test('reconexão depois de carregar faz somente consulta leve',async()=>{
   const x=makeScenario();await x.ctx.firebaseBootstrapRead();const months=x.requested.filter(q=>q==='months').length;
   const okay=await x.ctx.firebaseBootstrapRead(true);
   assert.equal(okay,true);assert.equal(x.requested.filter(q=>q==='months').length,months);
   assert(x.status.includes('PROBE'));
 });
 await test('erro em leitura parcial não produz estado oficial incompleto',async()=>{
   const x=makeScenario({failAudit:true});
   const okay=await x.ctx.firebaseBootstrapRead();
   assert.equal(okay,false);assert.equal(x.ctx.firebaseServerLoaded,false);
   assert(x.status.some(m=>m.includes('NÃO FOI POSSÍVEL SINCRONIZAR A BASE COMPLETA')));
 });
 await test('schema antigo envolvido em state permanece compatível',async()=>{
   const x=makeScenario({legacy:true});
   const ok=await x.ctx.firebaseBootstrapRead();
   assert.equal(ok,true);assert.equal(x.ctx.state.auditLog.length,1);
   assert.equal(x.ctx.state.months['2026-11'].distributions.length,3);
 });
 await test('renderização oficial da Distribuição Geral possui bloqueio do preview',async()=>{
   assert(source.includes('function renderDistribuicao(){\n  if(!firebaseServerLoaded){'));
 });
 await test('gravador continua exigindo hidratação e baseline oficiais',async()=>{
   assert(source.includes('if(!firebaseBaselineState || !firebaseServerLoaded)'));
 });
 console.log('MAIN_STAGED_FIREBASE_QA',n,'PASS 0 FAIL');
})().catch(e=>{console.error('FAILED',e.stack||e);process.exitCode=1});
