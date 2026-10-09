const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(require('node:path').join(__dirname,'..','preview.html'),'utf8');
const start=src.indexOf('async function directionFirebaseBootstrap'),end=src.indexOf('function directionAttachFirebaseListeners',start);
let reads=0,rest=0;
const ctx={firebaseReady:true,firebaseRef:{child:()=>({get(){reads++;return Promise.resolve({val:()=>({})});},once(){reads++;return Promise.resolve({val:()=>({})});}})},firebaseBootstrapInFlight:false,firebaseConnected:true,firebaseServerLoaded:true,firebaseListenerAttached:true,firebaseDatabase:null,directionHasRecentServerActivity:()=>true,directionShowConnecting(){},Promise,setTimeout:(fn,ms)=>{const t=setTimeout(fn,ms);t.unref();return t;},state:{},currentMonth:'2026-10',directionNormalizeState:x=>x,directionList:x=>x,$:()=>({value:'2026-10-09'}),availableMonths:()=>['2026-10'],liveTodayISO:()=> '2026-10-09',fillMonthFilter(){},directionMarkFirebaseActivity(){},directionAttachFirebaseListeners(){},render(){},directionFirebaseRestRead:async()=>{rest++;return true;},console,navigator:{onLine:true},updateConnection(){},directionScheduleFirebaseRetry(){}};
vm.createContext(ctx);vm.runInContext(src.slice(start,end),ctx);
(async()=>{
 await ctx.directionFirebaseBootstrap(true);assert.equal(reads,0);
 ctx.firebaseConnected=false;await ctx.directionFirebaseBootstrap(true);assert.equal(reads,2);
 ctx.firebaseRef.child=()=>({get:()=>Promise.reject(new Error('SDK unavailable'))});
 await ctx.directionFirebaseBootstrap(true);assert.equal(rest,1);
 console.log('PASS: 3 direction bootstrap/recovery cases');
})().catch(e=>{console.error(e);process.exitCode=1;});
