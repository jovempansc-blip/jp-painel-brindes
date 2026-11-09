const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const helper=html.slice(html.indexOf('const RETURN_TRANSFER_SEGMENTS='),html.indexOf('function returnCountsByDistribution(){'));
const balance=require('./return-balance.js');
const clone=x=>JSON.parse(JSON.stringify(x)),num=x=>Math.max(0,Number(x)||0),size=x=>x==='pair'?2:1;
let checks=0;
async function run({staleReadback=false,offline=false,duplicate=false}={}){
 let month={items:[{id:'I',date:'2026-11-03',slot:'09H',channel:'RÁDIO',distributionId:'D',qty:1,status:'REALIZADO',winnerName:'GANHADOR FICTÍCIO',reuseStatus:'sobra'}],promos:[],distributions:[{id:'D',total:6,campaignStockTotal:6,ar:3,app:0,ticketDefaultUnit:'pair',ticketUnits:{ar:'pair',app:'unit'},startDate:'2026-11-01',endDate:'2026-11-30'}]};
 const r={kind:'item',itemId:'I',winnerIndex:0,winnerCount:1,winner:'GANHADOR FICTÍCIO',distributionId:'D',monthKey:'2026-11',status:'sobra',id:'item:I:0'};
 let txCount=0,readCount=0,alerts=[],toasts=[];
 const remote={
  get:async()=>{readCount++;let v=clone(month);if(staleReadback&&readCount>1){v.items[0].returnTransferId='OUTRA';}return{val:()=>v}},
  transaction:async updater=>{
   txCount++;if(duplicate)month.items[0].returnTransferId='EXISTENTE';
   const v=updater(clone(month));if(v===undefined)return{committed:false};month=clone(v);return{committed:true,snapshot:{val:()=>clone(month)}};
  }
 };
 const ref={child:part=>{assert.equal(part,'months');return{child:key=>{assert.equal(key,'2026-11');return remote}}}};
 const state={currentMonth:'2026-11',months:{'2026-11':clone(month)}};
 const context={state,firebaseReady:true,firebaseConnected:!offline,firebaseServerLoaded:true,firebasePendingSave:false,firebaseStateRootRef:()=>ref,firebaseBaselineState:{months:{'2026-11':clone(month)}},
  JPReturnBalance:balance,findReturnRecordById:()=>r,clone,num,ticketUnit:(d,k)=>d.ticketUnits?.[k]||d.ticketDefaultUnit,allocated:d=>(num(d.ar)*2+num(d.app)),distributionCampaignMasterTotal:d=>d.campaignStockTotal,todayISO:()=> '2026-11-09',
  render:()=>{},renderReturnAlerts:()=>{},toast:msg=>toasts.push(String(msg)),alert:msg=>alerts.push(String(msg)),confirm:()=>true,
  firebaseNormalizeMonthValue:(key,data)=>data,window:{},Math,Date,Object,Array,Number,Set,Map,Promise,String,Error,console:{warn:()=>{}}};
 vm.createContext(context);vm.runInContext(helper,context);
 await vm.runInContext('transferReturnToSegment',context)(r.id,'app');
 return{month,txCount,readCount,alerts,toasts,ctx:context};
}
(async()=>{
 let x=await run();assert.equal(x.txCount,1);assert.equal(x.readCount,2);assert.equal(x.alerts.length,0);assert.equal(x.toasts.length,1);assert.equal(x.month.distributions[0].ar,2);assert.equal(x.month.distributions[0].app,2);assert.equal(x.ctx.state.months['2026-11'].distributions[0].ar,2);checks++;console.log('PASS acknowledged atomic Firebase transaction and verified readback');
 x=await run({staleReadback:true});assert.equal(x.txCount,1);assert.equal(x.toasts.length,0);assert(x.alerts.some(s=>s.includes('CONFERÊNCIA')));checks++;console.log('PASS false success blocked on divergent readback');
 x=await run({offline:true});assert.equal(x.txCount,0);assert.equal(x.toasts.length,0);assert(x.alerts.some(s=>s.includes('AGUARDE')));checks++;console.log('PASS offline transfer blocked before any write');
 x=await run({duplicate:true});assert.equal(x.toasts.length,0);assert(x.alerts.some(s=>s.includes('JÁ UTILIZADA')));checks++;console.log('PASS concurrent already-transferred source rejected atomically');
 console.log('SUMMARY',checks,'/4 PASS');
})().catch(err=>{console.error(err.stack||err);process.exit(1)})
