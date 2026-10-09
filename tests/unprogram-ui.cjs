const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const folder=require('node:path').resolve(__dirname,'..')+'/';
const engine=fs.readFileSync(folder+'assets/distribution-unprogram.js','utf8'),ui=fs.readFileSync(folder+'assets/distribution-unprogram-ui.js','utf8');
function setup({failMonth='',concurrent=false,mirrorFailure=false,incoming=false}={}){
 const item=(id,date)=>({id,date,distributionId:'D',slot:'08H',qty:1,channel:'RÁDIO',status:'PENDENTE'});
 const original={months:{'2026-10':{distributions:[{id:'D',total:10}],items:[item('A','2026-10-10'),item('B','2026-10-11')]},'2026-11':{distributions:[{id:'D',total:10}],items:[item('C','2026-11-01')]}},trash:[],auditLog:[],currentMonth:'2026-10'};
 const db=structuredClone(original),nodes={},messages=[],confirmations=[];
 function node(key){if(!nodes[key])nodes[key]={value:'',textContent:'',innerHTML:'',hidden:false,disabled:false,dataset:{},classList:{contains:()=>true},addEventListener(){}};return nodes[key];}
 let concurrentApplied=false;
 function ref(path=[]){return {child:k=>ref([...path,k]),async transaction(update){
  if(path[0]==='months'&&path[1]===failMonth)throw new Error('SIMULATED MONTH FAILURE');
  if(mirrorFailure&&path[0]==='trash')throw new Error('SIMULATED ARCHIVE FAILURE');
  if(concurrent&&!concurrentApplied&&path[0]==='months'){db.months['2026-10'].items[0].winnerName='REMOTE WINNER';db.months['2026-10'].items[0].status='REALIZADO';concurrentApplied=true;}
  let parent=db;for(const k of path.slice(0,-1))parent=parent[k];const key=path.at(-1),next=update(structuredClone(parent[key]));
  if(next===undefined)return {committed:false};parent[key]=next;if(incoming&&path[0]==='months'){db.months['2026-11'].items[0].qty=7;ctx.window.deferDistributionUnprogramEvent('month','2026-11',db.months['2026-11']);ctx.window.deferDistributionUnprogramEvent('root','systemMeta',{remote:1});}return {committed:true,snapshot:{val:()=>structuredClone(next)}};
 },async update(){}};}
 const ctx={state:structuredClone(original),firebaseBaselineState:structuredClone(original),firebasePendingSave:false,firebaseConnected:true,firebaseServerLoaded:true,firebaseSaveTimer:null,navigator:{onLine:true},console:{warn(){}},document:{addEventListener(){},querySelector(){}},window:{addEventListener(){},firebase:{database:{ServerValue:{TIMESTAMP:1}}}},$:node,distributionVisualRecord:()=>({id:'D',prize:'CINEMA'}),distributionVisualIds:r=>[r.id],distributionVisualGroupKey:r=>r.id,distributionLabel:r=>r.prize,distributionCampaignCopies:()=>[],todayISO:()=> '2026-10-09',monthStartDate:m=>m+'-01',monthEndDate:m=>m+'-31',labelMonth:x=>x,formatBR:x=>x,esc:x=>String(x??''),normalizeChannel:x=>x,itemStation:()=> 'JP1017',stationLabel:x=>x,promoStatusData:()=>({label:'ATIVA'}),openDrawer(){},closeDrawer:id=>{messages.push('CLOSED:'+id);},toast:t=>messages.push(t),confirm:t=>{confirmations.push(t);return true;},firebaseStateRootRef:()=>ref(),currentOperatorIdentity:()=>({name:'ADMIN',sector:'ADMIN'}),id:()=> 'OP_TEST',clearTimeout(){},clone:structuredClone,firebaseNormalizeMonthValue:(k,v)=>structuredClone(v),firebaseList:v=>Array.isArray(v)?v:Object.values(v||{}),mergeAuditRows:(a,b)=>[...(a||[]),...b],render(){},flushFirebaseNow:async()=>{},programItemRecord(){},CSS:{escape:x=>x}};
 ctx.applyFirebaseMonthEvent=(key,value)=>{ctx.state.months[key]=structuredClone(value);ctx.firebaseBaselineState.months[key]=structuredClone(value);};ctx.applyFirebaseRootEvent=(key,value)=>{ctx.state[key]=structuredClone(value);ctx.firebaseBaselineState[key]=structuredClone(value);};
 vm.createContext(ctx);vm.runInContext(engine,ctx);ctx.window.JPDistributionUnprogram=ctx.JPDistributionUnprogram;vm.runInContext(ui,ctx);
 ctx.openDistributionUnprogram('D');return {ctx,db,nodes,messages,confirmations};
}
(async()=>{
 let t=setup();t.nodes.distUnprogramMode.value='day';t.nodes.distUnprogramDay.value='2026-10-10';await t.ctx.applyDistributionUnprogram();
 assert.deepEqual(t.db.months['2026-10'].items.map(i=>i.id),['B']);assert.equal(t.db.months['2026-11'].items.length,1);assert.equal(t.db.months['2026-10'].distributions[0].total,10);assert.equal(t.db.trash.length,1);assert.equal(t.db.months['2026-10'].unprogramHistory.OP_TEST.removed[0].id,'A');assert.ok(t.messages.some(m=>m.includes('CONFIRMADO NO FIREBASE')));
 t=setup();t.nodes.distUnprogramMode.value='all';await t.ctx.applyDistributionUnprogram();assert.equal(t.db.months['2026-10'].items.length,0);assert.equal(t.db.months['2026-11'].items.length,0);assert.equal(t.db.trash.length,3);assert.ok(t.confirmations[0].includes('TODOS OS MESES'));
 t=setup({concurrent:true});await t.ctx.applyDistributionUnprogram();assert.equal(t.db.months['2026-10'].items[0].winnerName,'REMOTE WINNER');assert.equal(t.db.months['2026-10'].items.length,1);assert.ok(t.nodes.distUnprogramFeedback.textContent.includes('PRESERVADO'));
 t=setup({failMonth:'2026-11'});t.nodes.distUnprogramMode.value='all';await t.ctx.applyDistributionUnprogram();assert.equal(t.db.months['2026-10'].items.length,0);assert.equal(t.db.months['2026-11'].items.length,1);assert.equal(t.ctx.state.months['2026-10'].items.length,0);assert.ok(t.messages.some(m=>m.includes('PARCIAL')));
 t=setup({mirrorFailure:true});await t.ctx.applyDistributionUnprogram();assert.equal(t.db.months['2026-10'].items.length,0);assert.equal(t.db.months['2026-10'].unprogramHistory.OP_TEST.removed.length,2);assert.ok(t.nodes.distUnprogramFeedback.textContent.includes('HISTÓRICO'));
 t=setup();t.ctx.navigator.onLine=false;await t.ctx.applyDistributionUnprogram();assert.equal(t.db.months['2026-10'].items.length,2);assert.ok(!t.messages.some(m=>m.includes('CONFIRMADO')));
 t=setup({incoming:true});t.nodes.distUnprogramMode.value='day';t.nodes.distUnprogramDay.value='2026-10-10';await t.ctx.applyDistributionUnprogram();assert.equal(t.ctx.state.months['2026-11'].items[0].qty,7);assert.equal(t.ctx.firebaseBaselineState.months['2026-11'].items[0].qty,7);assert.equal(t.ctx.state.systemMeta.remote,1);
 console.log('PASS: UI/backend integration for day/all, stock, archive, concurrent winner, partial failure and offline');
})().catch(e=>{console.error(e);process.exitCode=1;});
