const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const js=fs.readFileSync(path.join(__dirname,'../assets/prog-manual.js'),'utf8');
const main=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
assert(main.includes('assets/prog-manual.js?v=AV58_1_33'),'cache atualizado');
assert(js.includes("'merchan','merchandising'"),'merchans preservados na seleção');
const date='2026-10-19',monthKey='2026-10';
const original={items:[
 {id:'old1',date,slot:'08H',station:'JP1017',channel:'RÁDIO',distributionId:'D1',qty:10,status:'PENDENTE'},
 {id:'old2',date,slot:'09H',station:'JP1017',channel:'RÁDIO',distributionId:'D1',qty:6,status:'PENDENTE'}],
 distributions:[{id:'D1',ar:15,startDate:'2026-10-01',endDate:'2026-10-31',title:'INGRESSO RODA GIGANTE'}],
 promos:[{id:'M1',kind:'merchan',name:'MERCHAN INSTITUCIONAL',station:'JP1017',opecPublicationStatus:'published',startDate:'2026-10-01',endDate:'2026-10-31',manualReadAssignments:[],readLog:[],missedLog:[]},{id:'P1',kind:'pauta',name:'PAUTA SEM MERCHAN',station:'JP1017',startDate:'2026-10-01',endDate:'2026-10-31',manualReadAssignments:[],readLog:[],missedLog:[]}],manualProgramHistory:[]};
const cp=obj=>JSON.parse(JSON.stringify(obj));
function session(){
 let month=cp(original),externalMutation=()=>{},commits=0;
 const refs={child(){return this;},async transaction(callback){const live=cp(month);externalMutation(live);externalMutation=()=>{};const updated=callback(cp(live));if(updated===undefined)return{committed:false,snapshot:{val:()=>cp(month)}};month=cp(updated);commits++;return{committed:true,snapshot:{val:()=>cp(month)}};}};
 const s={state:{months:{[monthKey]:cp(month)}},todayISO:()=>date,document:{readyState:'loading',addEventListener(){},getElementById(){return null;}},window:{alert:x=>s.alerts.push(String(x))},alerts:[],firebaseStateRootRef:()=>refs,firebaseConnected:true,firebaseServerLoaded:true,firebasePendingSave:false,firebaseReady:true,confirm:()=>true,toast:()=>{},sameStation:(a,b)=>a===b,normalizeSlot:x=>x,itemStation:i=>i.station,distStartDate:d=>d.startDate,distEndDate:d=>d.endDate,distributionLabel:d=>d.title,programFromSchedule:()=>'ROCK N POP',console:{error(){},warn(){}},Date,Map,Set,Number,JSON,String,Array,Object,Math};
 vm.createContext(s);
 const injected=js.replace(/\}\)\(\);\s*$/,'window.__test30={init(){draft=snapshot();mode="grade";},getDraft(){return draft;}, save, promoPool};})();');
 assert(injected.includes('window.__test30'));
 vm.runInContext(injected,s,{filename:'prog-manual.js'});
 const test=s.window.__test30;test.init();
 return {s,test,setRemote(fn){externalMutation=fn;},get month(){return month;},get commits(){return commits;}};
}
(async()=>{
 const names=x=>x.items.map(i=>[i.id,i.qty,i.slot]);
 // 1: one existing overage (16/15), save only merchan: allowed, prize items unchanged
 let t=session();assert(t.test.promoPool().some(p=>p.id==='M1'));
 t.test.getDraft().pautas.push({key:'MAN_M1',promoId:'M1',date,slot:'10H',station:'JP1017',program:'ROCK N POP'});
 await t.test.save();assert.equal(t.commits,1);assert.deepEqual(names(t.month),names(original));assert.equal(t.month.promos[0].manualReadAssignments.length,1);assert.equal(t.s.alerts.length,0);
 // 2: disallow increasing an already overbooked prize
 t=session();t.test.getDraft().items[1].qty=7;await t.test.save();assert.equal(t.commits,0);assert(t.s.alerts.some(m=>m.includes('SALDO INSUFICIENTE')));
 // 3: allow reducing an existing overage
 t=session();t.test.getDraft().items[1].qty=5;await t.test.save();assert.equal(t.commits,1);assert.equal(t.month.items[1].qty,5);
 // 4: allow moving prizes within a day if overage was already present
 t=session();t.test.getDraft().items[1].slot='11H';await t.test.save();assert.equal(t.commits,1);assert.equal(t.month.items[1].slot,'11H');
 // 5: merchan save cannot overwrite a prize corrected by a concurrent operator
 t=session();t.test.getDraft().pautas.push({key:'MAN_M1',promoId:'M1',date,slot:'10H',station:'JP1017',program:'ROCK N POP'});t.setRemote(m=>{m.items[1].qty=5;});await t.test.save();assert.equal(t.commits,1);assert.equal(t.month.items[1].qty,5);
 // 6: refuse stale merchan edit, do not overwrite concurrent assignment
 t=session();t.test.getDraft().pautas.push({key:'MAN_M1',promoId:'M1',date,slot:'10H',station:'JP1017',program:'ROCK N POP'});t.setRemote(m=>{m.promos[0].manualReadAssignments.push({key:'ANOTHER',date,slot:'11H',station:'JP1017',program:'ROCK N POP'});});await t.test.save();assert.equal(t.commits,0);assert(t.s.alerts.some(m=>m.includes('OUTRA SESSÃO MODIFICOU')));
 console.log('PASS: 6 cenários de PROG MANUAL · merchans, sobrecota preexistente, conflito e preservação');
})().catch(e=>{console.error(e);process.exit(1);});
