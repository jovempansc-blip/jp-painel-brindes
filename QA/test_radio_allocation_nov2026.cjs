'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync(path.join(__dirname,'../assets/jp-dist-editor-v2.js'),'utf8');
const main=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const start=code.indexOf('  function allocateFreeToRadio(){'),end=code.indexOf('  function configure(distribution){',start);
assert(start>=0&&end>start,'RADIO ACTION MISSING');
const actionCode=code.slice(start,end);
const planner=main.slice(main.indexOf('function radioPlannerNeeded('),main.indexOf('function makeRadioScheduleItem('));
let passed=0,failed=0;
const tests=[];
function test(title,fn){tests.push(Promise.resolve().then(fn).then(()=>{passed++;console.log('PASS',passed,title);},e=>{failed++;console.error('FAIL',title,e.stack||e);}));}
function fixture({free=20,mode='pair',existing=true,confirm=true,pending=false,alreadyProgrammed=35}={}){
 const row={dataset:{key:'ar'},q:{value:'35'},u:{value:mode},querySelector:function(selector){return selector==='.destQty'?this.q:this.u;}};
 const other={dataset:{key:'rs'},q:{value:'5'},u:{value:'pair'},querySelector:function(selector){return selector==='.destQty'?this.q:this.u;}};
 let rows=existing?[row,other]:[other];
 let quota=existing?(35*(mode==='pair'?2:1)+10)+free:10+free; // Quantidade fisica consumida pelos canais
 if(!existing)quota=10+free;
 const messages=[],statuses=[],alerts=[];
 const c={
  install:()=>true,
  distDestRows:()=>rows,
  stageDistributionReceiptFromInput:()=>{if(pending)quota+=20;return true;},
  normalizeReservationUnit:x=>x==='pair'?'pair':'unit',
  destinationConsumed:(qty,unit)=>qty*(unit==='pair'?2:1),
  formTotalUnitario:()=>quota,
  confirm:()=>confirm,
  alert:x=>alerts.push(String(x)),
  byId:key=>key==='distTicketDefaultUnit'?{value:mode}:null,
  updateDistDestinationSummary:()=>{},
  updateDistStockChangePreview:()=>{},
  refresh:()=>{},
  status:(...args)=>statuses.push(args),
  addDistributionDestination:(key)=>{
    const extra={dataset:{key},q:{value:'1'},u:{value:mode},querySelector:function(selector){return selector==='.destQty'?this.q:this.u;}};
    rows.push(extra);
  },Math,Number,String,
 };
 vm.createContext(c);
 vm.runInContext(actionCode,c);
 c.radioPlannerNeeded=(d,p)=>{const vmc={
  state:{currentMonth:'2026-11'},
  distributionRadioTotal:x=>x.ar,
  programmedForMonth:()=>p,Math,Number,String,
 };vm.createContext(vmc);vm.runInContext(planner,vmc);return vmc.radioPlannerNeeded(d);};
 return {go:()=>c.allocateFreeToRadio(),row,rows:()=>rows,statuses,alerts,messages,quota:()=>quota,radioNeeded:c.radioPlannerNeeded};
}
test('20 unidades livres viram 10 pares destinados ao Radio sem salvar automaticamente',()=>{
 const f=fixture({free:20});f.go();
 assert.equal(f.row.q.value,'45');
 assert(f.statuses.some(row=>row[0]==='pending'));
 assert.equal(f.radioNeeded({ar:45},35),10);
});
test('programação manual e geração automática podem usar os 10 novos pares depois de salvar',()=>{
 const f=fixture({free:20});f.go();
 assert.equal(f.radioNeeded({ar:Number(f.row.q.value)},35),10);
});
test('alocação não tenta criar horários de sorteio',()=>{
 const f=fixture({free:20});f.go();
 assert.equal(f.row.q.value,'45');
});
test('sem saldo livre não altera o canal Rádio',()=>{
 const f=fixture({free:0});f.go();
 assert.equal(f.row.q.value,'35');assert.equal(f.alerts.length,1);
});
test('uma única unidade livre não forma par',()=>{
 const f=fixture({free:1});f.go();
 assert.equal(f.row.q.value,'35');assert.equal(f.alerts.length,1);
});
test('se Rádio não existe, cria o canal com o número correto sem +1 extra',()=>{
 const f=fixture({free:20,existing:false});f.go();
 const radio=f.rows().find(r=>r.dataset.key==='ar');
 assert(radio);assert.equal(radio.q.value,'10');
});
test('cancelamento explícito mantém quantidades anteriores',()=>{
 const f=fixture({free:20,confirm:false});f.go();
 assert.equal(f.row.q.value,'35');
 assert.equal(f.statuses.length,0);
});
test('recebimento pendente de 20 unidades também pode ser alocado antes de salvar',()=>{
 const f=fixture({free:0,pending:true});f.go();
 assert.equal(f.row.q.value,'45');
});
test('entrega individual usa unidades e não pares',()=>{
 const f=fixture({free:8,mode:'unit'});
 f.go();
 assert.equal(f.row.q.value,'43');
});
(async()=>{await Promise.all(tests);console.log('RADIO-ALLOCATION',passed,'PASS',failed,'FAIL');if(failed)process.exitCode=1;})();

