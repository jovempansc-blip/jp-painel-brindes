const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const from=html.indexOf('function returnCountsByDistribution(){');
const to=html.indexOf('function activeBellNotifications(){',from);
const countCode=html.slice(from,to);
const histFrom=html.indexOf('function returnHistoricalOtherRegistrations(');
const histTo=html.indexOf('function renderReturnAlerts(){',histFrom);
const histCode=html.slice(histFrom,histTo);
const groupFrom=html.indexOf('function distributionVisualGroupKey(');
const groupTo=html.indexOf('function consolidateDistributionVisualRows(',groupFrom);
const groupCode=html.slice(groupFrom,groupTo);
let count=0;
function test(name,fn){fn();count++;console.log('PASS',name)}
const records=()=>[
 ...Array.from({length:15},(_,i)=>({kind:'item',id:`item:CELEBRATE-${i}:0`,distributionId:'CELEBRATE_2026',status:'sobra'})),
 ...Array.from({length:4},(_,i)=>({kind:'item',id:`item:BIGWHEEL-OUT-${i}:0`,distributionId:'BIGWHEEL_OCT',status:'sobra'})),
 ...Array.from({length:4},(_,i)=>({kind:'item',id:`item:PASSAPORTE-OUT-${i}:0`,distributionId:'PASSAPORTE_OCT',status:'sobra'})),
 {kind:'item',id:'item:TRANSFERRED:0',distributionId:'CELEBRATE_2026',status:'transferido'},
 {kind:'item',id:'item:TRANSFERRED:0',distributionId:'CELEBRATE_2026',status:'sobra'}, // old monthly copy
 {kind:'item',id:'item:PAST-REALLOCATED:0',distributionId:'CELEBRATE_2026',status:'realocado'},
 {kind:'item',id:'item:NOT-READY:0',distributionId:'BIGWHEEL_NOV',status:'pendente'},
 {kind:'item',id:'item:CANCELLED:0',distributionId:'PASSAPORTE_NOV',status:'cancelado'},
];
const nov=[
 {id:'CELEBRATE_2026',prize:'RADIO CELEBRATE 2026 - MEDUZA',title:'PAR DE INGRESSOS - RADIO CELEBRATE',startDate:'2026-10-09',endDate:'2026-11-19'},
 {id:'BIGWHEEL_NOV',prize:'INGRESSO RODA GIGANTE',title:'PAR DE INGRESSOS - FG BIG WHEEL EM B.CAMBORIÚ',startDate:'2026-11-03',endDate:'2026-11-30'},
 {id:'PASSAPORTE_NOV',prize:'PASSAPORTE DA DIVERSÃO',title:'PAR DE INGRESSOS - BETO CARRERO',startDate:'2026-11-02',endDate:'2026-11-30'},
 {id:'CINESYSTEM_NOV',prize:'INGRESSOS CINESYSTEM',title:'PAR DE INGRESSOS CINESYSTEM',startDate:'2026-11-02',endDate:'2026-11-30'}
];
const oct=[
 {id:'CELEBRATE_2026',...nov[0]},
 {id:'BIGWHEEL_OCT',prize:nov[1].prize,title:nov[1].title,startDate:'2026-10-06',endDate:'2026-10-31'},
 {id:'PASSAPORTE_OCT',prize:nov[2].prize,title:nov[2].title,startDate:'2026-10-06',endDate:'2026-10-31'}
];
const state={currentMonth:'2026-11',months:{'2026-10':{distributions:oct},'2026-11':{distributions:nov}}};
const ctx={state,returnRecords:()=>records(),num:n=>Math.max(0,Number(n)||0),
 distributionVisualIds:d=>Array.isArray(d.__visualGroupIds)?d.__visualGroupIds:[d.id],
 distStartDate:d=>d.startDate,distEndDate:d=>d.endDate,
 distributionLabel:d=>d.prize||d.title||'',norm:s=>String(s||'').trim(),esc:s=>String(s||'').replace(/[&<>"']/g,''),
 console,Map,Set,Object,Array,String,Number,Math,JSON,Error};
vm.createContext(ctx);
vm.runInContext(countCode+histCode+groupCode,ctx);
const counts=vm.runInContext('returnCountsByDistribution()',ctx);
test('Celebrate count includes 15 sobras and two settled returns, not other prizes',()=>{
 assert.equal(counts.CELEBRATE_2026.sobra,15);
 assert.equal(counts.CELEBRATE_2026.transferido,1);
 assert.equal(counts.CELEBRATE_2026.realocado,1);
 assert.equal(counts.CELEBRATE_2026.total,17);
});
test('Roda Gigante October remains independent from November cadastro',()=>{assert.equal(counts.BIGWHEEL_OCT.total,4);assert.equal(counts.BIGWHEEL_NOV,undefined)});
test('Passaporte October remains independent from November cadastro',()=>{assert.equal(counts.PASSAPORTE_OCT.total,4);assert.equal(counts.PASSAPORTE_NOV,undefined)});
test('Cinesystem without returns has zero',()=>{assert.equal(counts.CINESYSTEM_NOV,undefined)});
test('duplicate monthly snapshot counted once, most advanced state wins',()=>{assert.equal(counts.CELEBRATE_2026.transferido,1);assert.equal(counts.CELEBRATE_2026.sobra,15)});
test('cancelled or pending prizes do not increase confirmed return counter',()=>{assert.equal(counts.PASSAPORTE_NOV,undefined);assert.equal(counts.BIGWHEEL_NOV,undefined)});
test('each return cell has a single number without stacked explanatory text',()=>{
 const rendered=vm.runInContext('returnCell',ctx)(nov[0],counts);
 assert.match(rendered,/>17<\/button>/);
 assert(!rendered.includes('<small>'));
 assert(!rendered.includes('17 SOBRAS'));
 assert.match(rendered,/onclick="openReturnInventoryForDist/);
});
test('every current registration opens own return detail even with zero',()=>{
 for(const row of nov.slice(1)){
  const rendered=vm.runInContext('returnCell',ctx)(row,counts);
  assert.match(rendered,/>0<\/button>/);
  assert.match(rendered,new RegExp(`openReturnInventoryForDist\\('${row.id}'\\)`));
 }
});
test('same named records have distinct visual grouping IDs',()=>{
 const a=vm.runInContext('distributionVisualGroupKey',ctx)(nov[1]);
 const b=vm.runInContext('distributionVisualGroupKey',ctx)(oct[1]);
 assert.notEqual(a,b);
});
test('October Roda history is visible as separate cadastro, without joining November count',()=>{
 const rows=vm.runInContext('returnHistoricalOtherRegistrations',ctx)(nov[1]);
 assert.equal(rows.length,1);assert.equal(rows[0].id,'BIGWHEEL_OCT');assert.equal(rows[0].confirmed,4);
 assert.equal(vm.runInContext('returnCell',ctx)(nov[1],counts).includes('>4</button>'),false);
});
test('October Passaporte history visible only in review section, no automatic credit',()=>{
 const rows=vm.runInContext('returnHistoricalOtherRegistrations',ctx)(nov[2]);
 assert.equal(rows.length,1);assert.equal(rows[0].id,'PASSAPORTE_OCT');
 assert.equal(rows[0].confirmed,4);
 const body=vm.runInContext('returnHistoricalOtherHtml',ctx)(nov[2]);
 assert.match(body,/OUTROS CADASTROS/);
 assert.match(body,/NÃO FORAM SOMADOS/);
});
test('No related Cinesystem returns or false historical match',()=>{
 assert.equal(vm.runInContext('returnHistoricalOtherRegistrations',ctx)(nov[3]).length,0);
});
test('Compact CSS and table header remain scoped to RETORNO',()=>{
 assert(html.includes('class="num distReturnHead">RETORNO'));
 assert(html.includes('.returnCell .returnCountButton'));
 assert(html.includes('max-width:64px'));
});
console.log('SUMMARY',count,'/13 PASS');
