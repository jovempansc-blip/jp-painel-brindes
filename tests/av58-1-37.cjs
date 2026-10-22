'use strict';
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),vm=require('vm');
const api=require('../assets/return-balance.js');
const root=path.join(__dirname,'..');
const main=fs.readFileSync(path.join(root,'index.html'),'utf8');
const manual=fs.readFileSync(path.join(root,'assets/prog-manual.js'),'utf8');
const studio=fs.readFileSync(path.join(root,'painel_pauta_estudio_jovem_pan_GITHUB_API.html'),'utf8');
assert(main.includes('assets/return-balance.js?v=AV58_1_37'));
assert(manual.includes('JPReturnBalance.compute')&&main.includes('JPReturnBalance.compute'));
assert(studio.includes('patch.returnUnitSnapshot'));
assert(main.includes('function cancelReturnSobra('));
const monthKey='2026-10',today='2026-10-22';
const dist={id:'D1',ar:2,startDate:'2026-10-01',endDate:'2026-10-31',ticketUnits:{ar:'pair'},ticketDefaultUnit:'pair'};
const item=(id,status='PENDENTE',extra={})=>({id,distributionId:'D1',date:'2026-10-20',slot:'10H',qty:1,channel:'RÁDIO',status,...extra});
const calc=(month,d=dist,date=today)=>api.compute({month,distribution:d,monthKey,today:date});
// A single pair frees one draw, not two physical prizes.
const prize=item('W1','REALIZADO',{winnerName:'W A',reuseStatus:'sobra',stockUnits:2});
const planned=item('P1');
let result=calc({items:[prize,planned],promos:[]});
assert.equal(result.available,1);assert.equal(result.credits,1);assert.equal(result.physicalUnits,2);
assert.equal(result.unit,'pair');assert.equal(result.unitsPerPrize,2);
assert.equal(calc({items:[prize,planned,item('NEW')],promos:[]}).available,0);
assert.equal(calc({items:[prize,planned,item('NEW'),item('DOUBLE')],promos:[]}).available,-1);
// Explicit original unit overrides a later change from PAIR to INDIVIDUAL.
const wrong=item('W1','REALIZADO',{winnerName:'W A',reuseStatus:'sobra',stockUnits:1,returnUnitsPerWinner:1});
result=calc({items:[wrong,planned],promos:[]});assert.equal(result.credits,0);assert(result.issues.some(i=>i.code==='UNIT_MISMATCH'));
assert.equal(calc({items:[{...prize,deliveredAt:today},planned]}).credits,0);
assert.equal(calc({items:[prize,planned]},dist,'2026-11-02').credits,0);
// Multiple winners are independent, with an original-item cap to prevent phantom stock.
const group=item('MULTI','REALIZADO',{qty:2,stockUnits:4,winnerName:'A, B',winnerNames:['A','B'],winnerDeliveries:[{reuseStatus:'sobra'},{}]});
result=calc({items:[group],promos:[]});assert.equal(result.credits,1);assert.equal(result.physicalUnits,2);
assert.equal(calc({items:[{...group,winnerDeliveries:[],reuseStatus:'sobra'}]}).credits,0,'legacy status on entire group is ambiguous');
assert.equal(calc({items:[{...group,qty:1,winnerDeliveries:[{reuseStatus:'sobra'},{reuseStatus:'sobra'}]}]}).credits,1,'cannot return more packages than original award');
// Physical promo source and confirmed winner are required.
const physical=item('PHYS','REALIZADO',{sourceType:'promo-result',promoId:'PROMO',qty:1,slot:'15H'});
const promo={id:'PROMO',distributionId:'D1',segmentKey:'ar',resultWinnersByHour:{'2026-10-20-1500':[{name:'A',reuseStatus:'sobra'}]}};
result=calc({items:[physical,planned],promos:[promo]});assert.equal(result.credits,1);
assert.equal(calc({items:[planned],promos:[promo]}).credits,0,'virtual promo cannot free physical radio quota');
assert.equal(calc({items:[physical,planned],promos:[{...promo,segmentKey:'rs'}]}).credits,0);
// Auto-reused returns offset one extra scheduled prize, with a verified link.
const returned={...prize,reuseStatus:'realocado',reusedItemId:'REUSED'};
const reused={...item('REUSED'),returnedReuse:true,returnedFrom:'item:W1:0'};
result=calc({items:[returned,planned,reused]});assert.equal(result.credits,1);assert.equal(result.available,0);
assert.equal(calc({items:[returned,planned]}).credits,0,'orphaned auto-reuse does not create a credit');
// Different month / missing original evidence is rejected.
assert.equal(api.compute({month:{items:[prize]},distribution:dist,monthKey:'2026-11',today:'2026-11-10'}).credits,0);
// The Distribution function and PROG MANUAL use the same computation on one period.
function sourceFunction(text,name){const prefix='function '+name+'(';const idx=text.indexOf(prefix);assert(idx>=0,name);let brace=text.indexOf('{',idx),level=0;for(let i=brace;i<text.length;i++){if(text[i]==='{')level++;if(text[i]==='}'&&--level===0)return text.slice(idx,i+1);}throw Error('unclosed '+name);}
const s={JPReturnBalance:api,state:{currentMonth:monthKey,months:{[monthKey]:{distributions:[dist],items:[prize,planned],promos:[]}}},distributionVisualIds:d=>[d.id],monthDataForKey:key=>s.state.months[key],todayISO:()=>today,ticketUnit:()=>'pair'};
vm.createContext(s);vm.runInContext(sourceFunction(main,'distributionReprogramStatus'),s);
assert.equal(s.distributionReprogramStatus(dist,monthKey).available,result.available+1,'shared distribution computes correct available prizes');
console.log('PASS AV58.1.37: saldo unificado, pares, ganhadores, legado ambíguo, promo, vigência, crédito único e origem');
