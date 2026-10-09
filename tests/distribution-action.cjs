const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8');
const pos=source.indexOf('function deleteDist('),start=source.slice(pos-6,pos)==='async '?pos-6:pos;
const code=source.slice(start,source.indexOf('function saveDistributionFromForm',pos));
function setup(){
 const original={currentMonth:'2026-10',months:{'2026-10':{distributions:[{id:'D'}]},'2026-09':{distributions:[{id:'D'}]}}};
 const messages=[];let resolve;
 const ctx={state:structuredClone(original),monthDataForKey(k){return ctx.state.months[k];},distributionDependencies:()=>({items:[],promos:[]}),monthStartDate:k=>k+'-01',labelMonth:k=>k,distributionLabel:()=> 'PRÊMIO',confirm:()=>true,alert(){},clone:structuredClone,trashRecord(){},auditEvent(){},saveState:()=>true,flushFirebaseNow:()=>new Promise(r=>resolve=r),render(){},toast:t=>messages.push(t),rollbackToFirebaseBaseline(){ctx.state=structuredClone(original);},console:{warn(){}}};
 vm.createContext(ctx);vm.runInContext(code,ctx);return{ctx,messages,confirmSave:()=>resolve()};
}
(async()=>{
 let t=setup(),p=t.ctx.deleteDist('D');
 assert.ok(p&&typeof p.then==='function','deletion must await Firebase');
 assert.equal(t.messages.length,0,'must not announce success before server ack');
 t.confirmSave();await p;assert.equal(t.ctx.state.months['2026-10'].distributions.length,0);assert.equal(t.ctx.state.months['2026-09'].distributions.length,1);assert.ok(t.messages.some(x=>x.includes('CONFIRMADA')));
 t=setup();t.ctx.flushFirebaseNow=async()=>{throw new Error('offline');};await t.ctx.deleteDist('D');assert.equal(t.ctx.state.months['2026-10'].distributions.length,1);assert.ok(!t.messages.some(x=>x.includes('CONFIRMADA')));
 t=setup();t.ctx.distributionDependencies=()=>({items:[{monthKey:'2026-10',i:{id:'PRIZE'}}],promos:[]});await t.ctx.deleteDist('D');assert.equal(t.ctx.state.months['2026-10'].distributions.length,1);
 console.log('PASS: deletion waits for ack, preserves history, rolls back failure and protects dependencies');
})().catch(e=>{console.error(e);process.exitCode=1;});
