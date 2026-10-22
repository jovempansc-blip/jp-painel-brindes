'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.join(__dirname,'..');
const script=fs.readFileSync(path.join(root,'assets/prog-manual.js'),'utf8');
const page=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(page.includes('src="assets/prog-manual.js?v=AV58_1_37"'),'cache da correção deve atualizar');
assert(script.includes('if(manualSlotIsPast(type,date,to))'),'bloqueio temporal centralizado');
const src=script.slice(script.indexOf('  function manualSlotIsPast('),script.indexOf('  function showQtyDialog('));
assert(src.startsWith('  function manualSlotIsPast(')&&src.includes('  function add('),'funções disponíveis');
class TestClock extends Date { constructor(...args){if(args.length)super(...args);else super(2026,9,21,15,9,0);}}
const alerts=[],paints=[];
const context={Date:TestClock,slotOrder:x=>({ '14H':14,'15H':15,'15H30':15.5,'16H':16 })[x]??NaN,
    date:'2026-10-21',station:'JP1017',iso:()=> '2026-10-21',officialSlots:()=> ['14H','15H','15H30','16H'],
    reject:x=>{alerts.push(x);return false},draft:{pautas:[],items:[]},promoPool:()=>[{id:'PAUTA_A',name:'PAUTA A'},{id:'MERCHAN_B',name:'MERCHAN B',kind:'merchan'}],
    slot:x=>x,programFromSchedule:()=> 'AS MAIS PEDIDAS',paint:()=>{paints.push(1)}};
vm.createContext(context);
vm.runInContext(src,context);
const at=(type,date,time,clock)=>context.manualSlotIsPast(type,date,time,new Date(clock));
assert.strictEqual(at('pauta','2026-10-21','15H','2026-10-21T15:09:00'),false,'pauta da hora atual permitida');
assert.strictEqual(at('pauta','2026-10-21','15H','2026-10-21T15:59:59'),false,'pauta até fim da hora');
assert.strictEqual(at('pauta','2026-10-21','14H','2026-10-21T15:09:00'),true,'hora anterior bloqueada');
assert.strictEqual(at('pauta','2026-10-20','15H','2026-10-21T15:09:00'),true,'data anterior bloqueada');
assert.strictEqual(at('pauta','2026-10-21','16H','2026-10-21T15:09:00'),false,'hora futura permitida');
assert.strictEqual(at('pauta','2026-10-22','08H','2026-10-21T15:09:00'),false,'data futura permitida');
assert.strictEqual(at('assigned-pauta','2026-10-21','15H','2026-10-21T15:09:00'),false,'movimentação de pauta para hora atual permitida');
assert.strictEqual(at('prize','2026-10-21','15H','2026-10-21T15:09:00'),true,'restrição atual de prêmio preservada');
assert.strictEqual(at('item','2026-10-21','15H','2026-10-21T15:09:00'),true,'remanejamento de prêmio passado continua bloqueado');
assert.strictEqual(at('pauta','2026-10-21','15H30','2026-10-21T15:40:00'),false,'pauta na mesma hora com meia hora');
assert.strictEqual(context.add('pauta','PAUTA_A','15H'),true,'inserção de pauta na hora atual');
assert.strictEqual(context.draft.pautas.length,1);
assert.strictEqual(context.add('pauta','PAUTA_A','15H'),false,'duplicidade do mesmo material no mesmo horário recusada');
assert.strictEqual(context.add('pauta','PAUTA_A','14H'),false,'inserção de pauta em hora encerrada recusada');
assert.strictEqual(context.add('pauta','MERCHAN_B','15H'),true,'inserção de merchan na hora atual');
assert.strictEqual(context.draft.pautas.length,2);
assert.strictEqual(context.add('prize','PRIZE_X','15H'),false,'premiação retroativa continua recusada');
context.date='2026-10-20';
assert.strictEqual(context.add('pauta','PAUTA_A','15H'),false,'data passada bloqueada pela validação existente');
assert.strictEqual(paints.length,2,'apenas inserções válidas atualizaram prévia');
console.log('PASS AV58.1.35: pauta e merchan na hora corrente, bloqueios históricos e prêmio preservados');
