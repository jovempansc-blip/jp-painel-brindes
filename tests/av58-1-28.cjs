'use strict';
const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function get(start,end){const a=html.indexOf(start);assert(a>=0,start);const b=html.indexOf(end,a);assert(b>a,end);return html.slice(a,b);}
const clone=x=>JSON.parse(JSON.stringify(x));
(async()=>{
  // Full collection transactions must reject concurrent writes to the same ID,
  // without rejecting unrelated writes to different IDs.
  const ctx={clone,sameValue:(a,b)=>JSON.stringify(a)===JSON.stringify(b),firebaseList:v=>Array.isArray(v)?v.filter(Boolean):Object.values(v||{}).filter(Boolean),recordIdentity:r=>r.id,console};
  vm.createContext(ctx);
  vm.runInContext(get('function diffNode(','function applyKeyedObjectPlan('),ctx);
  let current=[{id:'A',title:'ANTES'},{id:'B',title:'MANTER'}],calls=0;
  ctx.firebaseStateRootRef=()=>({child:()=>({transaction:async callback=>{calls++;current=callback(current);return {committed:true};}})});
  vm.runInContext(get('async function persistCollectionDiff(','function applyCollectionPlanToRows('),ctx);
  await ctx.persistCollectionDiff('months/2026-10/items',[{id:'A',title:'ANTES'},{id:'B',title:'MANTER'}],[{id:'A',title:'NOVO'},{id:'B',title:'MANTER'}]);
  assert.equal(current[0].title,'NOVO');assert.equal(calls,1);
  await assert.rejects(ctx.persistCollectionDiff('months/2026-10/items',[{id:'A',title:'ANTES'},{id:'B',title:'MANTER'}],[{id:'A',title:'SOBRESCRITA'},{id:'B',title:'MANTER'}]),/CONFLITO/);
  const originalRemote=[{id:'A',title:'ANTES'},{id:'B',title:'ALTERADO EM OUTRA MÁQUINA'}];
  current=originalRemote;
  await ctx.persistCollectionDiff('months/2026-10/items',[{id:'A',title:'ANTES'},{id:'B',title:'MANTER'}],[{id:'A',title:'NOSSO'},{id:'B',title:'MANTER'}]);
  assert.equal(current[0].title,'NOSSO');assert.equal(current[1].title,'ALTERADO EM OUTRA MÁQUINA');
  const countBefore=calls;
  await ctx.persistCollectionDiff('months/2026-10/items',current,current);
  assert.equal(calls,countBefore,'sem mudança não gera uma transação');

  // Write queue: second edit made mid-ack must be persisted separately.
  const delays=[];const snapshots=[];
  const q={
    firebaseSaveInFlight:null,firebaseMutationRevision:1,firebaseReady:true,firebaseRef:{},firebaseConnected:true,firebaseServerLoaded:true,
    firebasePendingSave:true, firebaseBaselineState:{months:{'2026-10':{items:[{id:'a',title:'BASE'}]}}},
    state:{months:{'2026-10':{items:[{id:'a',title:'UM'}]}},currentMonth:'2026-10'},
    initFirebaseSync(){},rollbackToFirebaseBaseline(){throw new Error('Não deveria reverter')},scheduleFirebaseRetry(){},
    normalizePanelState(){},countStateRecords(){return 1},workspaceEmptyAfterTrackedDeletion(){return false},
    jpFirebaseNow:()=>1,jpFirebaseMeasure(){},clone,
    updateSyncStatus(){},renderBackup(){},toast(){},console,navigator:{onLine:true},
    async persistGranularState(batch){snapshots.push(clone(batch));if(snapshots.length===1)await new Promise(resolve=>delays.push(resolve));},
    Date, Promise
  };
  vm.createContext(q);
  vm.runInContext(get('async function saveStateToApi(){','async function flushFirebaseNow('),q);
  const first=q.saveStateToApi();
  assert.equal(snapshots.length,1);
  q.state.months['2026-10'].items[0].title='DOIS';
  q.firebaseMutationRevision=2;
  q.firebasePendingSave=true;
  const sameFlight=q.saveStateToApi();
  delays.shift()();
  await Promise.all([first,sameFlight]);
  assert.deepEqual(snapshots.map(s=>s.months['2026-10'].items[0].title),['UM','DOIS']);
  assert.equal(q.firebasePendingSave,false);
  assert.equal(q.firebaseSaveInFlight,null);
  console.log('PASS: AV58.1.28 conflitos, registros independentes, não alteração, gravações seriais e edições durante ACK');
})().catch(e=>{console.error(e);process.exitCode=1;});
