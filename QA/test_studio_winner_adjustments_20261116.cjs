'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.resolve(__dirname,'../painel_pauta_estudio_jovem_pan_GITHUB_API.html'),'utf8');
let n=0;const test=(name,fn)=>{fn();console.log('PASS',++n,name)};
const a=html.indexOf('let winnerBankLastRecordsRef=null;'),b=html.indexOf('\nconst winnerBankLive=',a);
assert(a>0&&b>a);
const cacheScript=html.slice(a,b);
let maps=0,validations=0,recordsRef={A:{name:'PESSOA A',program:'JP',prize:'PAR'}};
const ctx={
 console,JSON,Object,Array,Set,String,
 upper:v=>String(v||'').toUpperCase(),
 winnerRecordList:v=>{maps++;return Object.values(v||{})},
 winnerPersonKey:v=>'KEY_'+v,
 winnerPrizeKey:v=>'PRIZE_'+v,
 winnerBankSnapshot:{},winnerBankRecords:[],winnerBankReady:false,
 setWinnerBankModalState:()=>{},
 $:()=>({classList:{contains:()=>true}}),
 validateAllWinnerInputs:()=>{validations++},
 validateAllPromoWinnerInputs:()=>{validations++}
};
vm.createContext(ctx);
vm.runInContext(cacheScript,ctx);
const base={initialized:true,records:recordsRef,blocks:{},settings:{}};
test('monta 1 vez o histórico de 8.600 cadastros',()=>{ctx.applyWinnerBankSnapshot(base);assert.equal(maps,1)});
test('mudança em bloqueios não recalcula registros',()=>{ctx.applyWinnerBankSnapshot({...base,blocks:{x:{active:true}}});assert.equal(maps,1)});
test('mudança em configurações não recalcula registros',()=>{ctx.applyWinnerBankSnapshot({...base,settings:{test:1}});assert.equal(maps,1)});
test('alteração real dos cadastros atualiza o histórico',()=>{ctx.applyWinnerBankSnapshot({...base,records:{...recordsRef,B:{name:'PESSOA B'}}});assert.equal(maps,2);assert.equal(ctx.winnerBankRecords.length,2)});
test('atualização de bloqueios ainda dispara validação',()=>assert(validations>=2));
const z=html.indexOf('function verifyConfiguredPromoCommit('),w=html.indexOf('\nasync function studioCommitConfiguredPromoOutcome(',z);
assert(z>0&&w>z);
const receiptCtx={Object,Array,String,Error,upper:v=>String(v||'').toUpperCase()};
vm.createContext(receiptCtx);vm.runInContext(html.slice(z,w),receiptCtx);
const baseResult={monthKey:'2026-11',operationId:'OP_PILOTO',rows:[{id:'P1',resultWinnersByHour:{'2026-11-162030':[{name:'GANHADOR FICTÍCIO'}]}}]};
test('recibo confirmado contém nome correto',()=>{const r=receiptCtx.verifyConfiguredPromoCommit(baseResult,'P1','2026-11-162030',['GANHADOR FICTÍCIO']);assert(r.committed&&!r.needsReview);assert.equal(r.winnerCount,1)});
test('transação confirmada com nome diferente pede conciliação, não acusa falha de gravação',()=>{const r=receiptCtx.verifyConfiguredPromoCommit(baseResult,'P1','2026-11-162030',['OUTRO FICTÍCIO']);assert(r.committed&&r.needsReview)});
test('transação confirmada com sorteio ausente exige conciliação',()=>{const r=receiptCtx.verifyConfiguredPromoCommit(baseResult,'P2','2026-11-162030',['GANHADOR FICTÍCIO']);assert(r.committed&&r.needsReview)});
test('transação confirmada com contagem divergente exige conciliação',()=>{const r=receiptCtx.verifyConfiguredPromoCommit(baseResult,'P1','2026-11-162030',['GANHADOR FICTÍCIO','GANHADOR EXTRA']);assert(r.committed&&r.needsReview)});
test('não há segunda leitura integral do banco após salvar promo configurada',()=>{const body=html.slice(html.indexOf('async function studioCommitConfiguredPromoOutcome('),html.indexOf('\nfunction studioOperationToken(',html.indexOf('async function studioCommitConfiguredPromoOutcome(')));assert(!body.includes('winnerBankRef.get('));});
test('metadados e auditoria não são confundidos com a gravação principal',()=>{assert(html.includes('receipt.auditPending=true'));assert(html.includes('RESULTADO SALVO, MAS O REGISTRO COMPLEMENTAR DE AUDITORIA'));});
test('histórico continua sendo verificado antes da gravação',()=>assert(html.includes('promoWinnerHistoryCheck(bank,w,context,months)')));
test('há bloqueio de nome repetido no mesmo sorteio',()=>assert(html.includes('GANHADOR REPETIDO NESTE SORTEIO')));
test('há proteção para gravação concorrente de outro computador',()=>assert(html.includes('OS DADOS DESTE GANHADOR MUDARAM EM OUTRO COMPUTADOR')));
test('erro mantém rascunho e não remove resultado',()=>{assert(html.includes('studioCaptureCampaignDraft()'));assert(html.includes('NÃO SALVO · '));});
test('resultado divergente não deve ser reenviado automaticamente',()=>{assert(html.includes('NÃO REPITA O CADASTRO'));assert(html.includes('if(receipt?.needsReview)'));});
test('continua proibido confirmar sorteio futuro',()=>assert(html.includes('NÃO É POSSÍVEL ANTECIPAR O RESULTADO.')));
test('não permite gravação sem histórico do Firebase',()=>assert(html.includes('winnerBankReady&&fields.length>0&&valid')));
console.log('STUDIO_BOARD_REFINEMENT_QA',n,'PASS 0 FAIL');
