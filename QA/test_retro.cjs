const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const s=fs.readFileSync(require('path').join(__dirname,'..','assets','prog-manual.js'),'utf8');
const code=s.slice(s.indexOf('  function add(type,idValue,to){'),s.indexOf('  function showQtyDialog(',s.indexOf('  function add(')));
let pass=0;
function fixture(dateValue='2026-11-02',balanceValue=2){
 const alerts=[],called=[],d={id:'X',title:'PRÊMIO 1',prize:'PRÊMIO 1'};
 const ctx={state:{months:{'2026-11':{distributions:[d]}}},date:dateValue,station:'JP1017',pending:null,draft:{items:[],pautas:[]},iso:()=> '2026-11-02',
 officialSlots:()=>['08H','18H'],manualSlotIsPast:(type,date,slot)=>date<'2026-11-02'||slot==='08H',prizes:()=>[d],balance:()=>balanceValue,
 showQtyDialog:d=>called.push(d),reject:msg=>{alerts.push(msg);return false;},
 programFromSchedule:()=> 'LOCUTOR',paint:()=>{},locked:()=>false,window:{}};
 vm.createContext(ctx);
 vm.runInContext(code,ctx);
 return{add:(...args)=>vm.runInContext('add',ctx)(...args),ctx,alerts,called};
}
let a=fixture();assert.equal(a.add('prize','X','08H'),true);assert.equal(a.ctx.pending.retroactive,true);assert.equal(a.called.length,1);pass++;console.log('PASS prize in past hour allowed');
a=fixture();assert.equal(a.add('prize','X','18H'),true);assert.equal(a.ctx.pending.retroactive,false);pass++;console.log('PASS future prize unaffected');
a=fixture();assert.equal(a.add('pauta','P','08H'),false);assert.equal(a.alerts.length,1);pass++;console.log('PASS past pauta blocked');
a=fixture('2026-11-01');assert.equal(a.add('prize','X','08H'),true);assert.equal(a.ctx.pending.retroactive,true);pass++;console.log('PASS past date prize allowed with retroactive marker');
a=fixture('2026-11-02',0);assert.equal(a.add('prize','X','08H'),false);pass++;console.log('PASS stock zero blocked');
a=fixture();assert.equal(a.add('item','OLD','08H'),false);pass++;console.log('PASS past reallocation blocked');
const confirmCode=s.slice(s.indexOf('  function confirmQty(){'),s.indexOf('  function onEvents(){'));
const d={id:'X',title:'PRÊMIO 1',prize:'PRÊMIO 1'};
let asked=0,confirmCalls=0;
const ctx={pending:{idValue:'X',to:'08H',retroactive:true},date:'2026-11-01',station:'JP1017',draft:{items:[]},iso:()=> '2026-11-02',
 prizes:()=>[d],balance:()=>2,el:id=>({value:'1'}),Number,Math,Date,String,dayName:()=> 'SEGUNDA',countryDate:()=> '01/11/2026',weekLabel:()=> '44',distributionLabel:()=> 'PREMIO 1',programFromSchedule:()=> 'HORARIO',closeQty:()=>{},paint:()=>{},reject:msg=>{throw new Error(msg)},
 window:{prompt:()=>{asked++;return 'PAINEL FORA DO AR'},confirm:()=>{confirmCalls++;return true}}};
vm.createContext(ctx);vm.runInContext(confirmCode,ctx);
vm.runInContext('confirmQty',ctx)();
assert.equal(ctx.draft.items.length,1);let item=ctx.draft.items[0];
assert.equal(item.status,'PENDENTE');assert.equal(item.date,'2026-11-01');assert.equal(item.manualRetroactive,true);
assert.equal(item.manualRetroactiveReason,'PAINEL FORA DO AR');
assert.equal(item.winnerName,undefined);
assert.equal(asked,1);assert.equal(confirmCalls,1);pass++;console.log('PASS retroactive reason stored, winner remains official studio flow');
let c={...ctx,date:'2026-11-02',pending:{idValue:'X',to:'18H',retroactive:false},draft:{items:[]},window:{prompt:()=>{throw Error('Unexpected prompt')},confirm:()=>{throw Error('Unexpected confirm')}}};
vm.createContext(c);vm.runInContext(confirmCode,c);vm.runInContext('confirmQty',c)();
assert.equal(c.draft.items[0].manualRetroactive,false);pass++;console.log('PASS future slot requires no retroactive prompt');
console.log('SUMMARY',pass,'/',8,'PASS');

