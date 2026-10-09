const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname,'..')+'/';
const studio=fs.readFileSync(root+'painel_pauta_estudio_jovem_pan_GITHUB_API.html','utf8');
function extract(source,start,end){return source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));}
async function run(){
 let reads=0;
 const context={navigator:{onLine:true},firebaseReady:true,firebaseRef:{child:()=>({get:()=>{reads++;return Promise.resolve({val:()=>({})});},once:()=>{reads++;return Promise.resolve({val:()=>({})});}})},firebaseDatabase:null,firebaseConnected:true,firebaseServerLoaded:true,state:{},manual:false,selectedIndex:0,studioRefreshPromise:null,studioRealtimeBound:true,firebaseReconnectTimer:null,normalizeStudioStateShape:x=>x,attachStudioRealtimeListeners(){},selectStudioMonth(){},render(){},clearTimeout,setTimeout:(fn,ms)=>{const t=setTimeout(fn,ms);t.unref();return t;},Promise,Date,console,scheduleStudioFirebaseReconnect(){}};
 vm.createContext(context);
 vm.runInContext(extract(studio,'async function forceStudioFirebaseRefresh','function queueStudioRealtimeRender'),context);
 await vm.runInContext('forceStudioFirebaseRefresh(true)',context);
 assert.equal(reads,0,'quiet, connected studio must not download months again');
 context.firebaseConnected=false;context.firebaseServerLoaded=false;reads=0;
 await vm.runInContext('Promise.all([forceStudioFirebaseRefresh(true),forceStudioFirebaseRefresh(true)])',context);
 assert.equal(reads,4,'concurrent reconnects must share one bootstrap');
 const sync=extract(studio,'function syncStateFromApi','function winnerPlain');
 let reconnects=0;
 Object.assign(context,{firebaseConnected:true,firebaseServerLoaded:true,firebaseLastSnapshotAt:0,initFirebaseSync(){},scheduleStudioFirebaseReconnect(){reconnects++;}});
 vm.runInContext(sync,context);vm.runInContext('syncStateFromApi(false)',context);
 assert.equal(reconnects,0,'idle data is not a failed connection');
 console.log('PASS: connected idle state, concurrent bootstrap, idle reconnect');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
