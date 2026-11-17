'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.resolve(__dirname,'../painel_pauta_estudio_jovem_pan_GITHUB_API.html'),'utf8');
const from=html.indexOf('function verifyConfiguredPromoCommit(');
const to=html.indexOf('\nfunction studioOperationToken(',from);
assert(from>0&&to>from);
const productionFns=html.slice(from,to);
let n=0;const test=async(name,fn)=>{await fn();console.log('PASS',++n,name)};
const winner=[{id:'PW_FICTICIO',name:'PESSOA TESTE FICTICIA'}];
const key='2026-11-162030';
function fixture({mismatch=false,failedAudit=false,failedWrite=false}={}){
 const record={id:'P1',kind:'promo',winnerRegistration:{fields:{name:'result'}},resultWinnersByHour:{}};
 let reads=0,updates=0,processed=0,commits=0;
 const ctx={
  console,Promise,Date,Math,Object,Array,Set,String,Error,
  upper:s=>String(s||'').trim().toUpperCase(),
  ensureStudioFirebaseOnline:async()=>true,
  initWinnerBank:()=>{},
  winnerBankRef:{get(){reads++;throw Error('FORBIDDEN FULL BANK GET')}},
  findPromoById:id=>record,
  timeToHHMM:x=>'20:30',
  formatStudioTime:x=>'20H30',
  studioOperatorIdentity:()=>({name:'QA',sector:'ESTUDIO'}),
  studioRecordMonths:()=>['2026-11'],
  studioCampaignVisible:()=>true,stationAllowed:()=>true,
  promoOccurrenceForItem:()=>({date:'2026-11-16'}),
  state:{months:{'2026-11':{promos:[record]}}},
  firebaseRef:{async update(){updates++;return true}},
  window:{firebase:{database:{ServerValue:{TIMESTAMP:0}}}},
  async appendStudioAudit(){processed++;if(failedAudit)throw Error('AUDIT OFFLINE')},
  async promoWinnerStore(){
    if(failedWrite)throw Error('SIMULATED FIREBASE TRANSACTION FAILURE');
    commits++;
    return {monthKey:'2026-11',operationId:'COMMITTED_OP',rows:[{
      ...record,resultWinnersByHour:{[key]:mismatch?[{name:'NOME OUTRO'}]:winner}
    }]};
  }
 };
 vm.createContext(ctx);vm.runInContext(productionFns,ctx);
 const payload={collection:'promos',recordId:'P1',context:{date:'2026-11-16',program:'JP',prize:'PAR',sourceRef:'PROMO:P1:2026-11-16:20H30'},
 occurrenceKey:key,patch:{resultSlot:'20H30',resultWinnersByHour:{[key]:winner}}};
 return {ctx,payload,get stats(){return{reads,updates,processed,commits}}};
}
(async()=>{
 await test('salva e valida nomes depois da transação confirmada',async()=>{
  const f=fixture(),r=await f.ctx.studioCommitConfiguredPromoOutcome(f.payload);
  assert.equal(r.committed,true);assert.equal(r.needsReview,false);assert.equal(r.winnerCount,1);assert.equal(f.stats.commits,1);
 });
 await test('não faz releitura do banco inteiro após salvar',async()=>{
  const f=fixture();await f.ctx.studioCommitConfiguredPromoOutcome(f.payload);
  assert.equal(f.stats.reads,0);
 });
 await test('metadados e auditoria enviados após confirmação do resultado',async()=>{
  const f=fixture();await f.ctx.studioCommitConfiguredPromoOutcome(f.payload);
  assert.equal(f.stats.updates,1);assert.equal(f.stats.processed,1);
 });
 await test('falha de auditoria não transforma resultado confirmado em não salvo',async()=>{
  const f=fixture({failedAudit:true}),r=await f.ctx.studioCommitConfiguredPromoOutcome(f.payload);
  assert.equal(r.committed,true);assert.equal(r.auditPending,true);assert.equal(f.stats.commits,1);
 });
 await test('gravação confirmada com nomes divergentes pede conciliação sem perder registro',async()=>{
  const f=fixture({mismatch:true}),r=await f.ctx.studioCommitConfiguredPromoOutcome(f.payload);
  assert.equal(r.committed,true);assert.equal(r.needsReview,true);assert.equal(f.stats.commits,1);
 });
 await test('falha real da transação é propagada; não marca sucesso',async()=>{
  const f=fixture({failedWrite:true});
  await assert.rejects(f.ctx.studioCommitConfiguredPromoOutcome(f.payload),/SIMULATED FIREBASE TRANSACTION FAILURE/);
  assert.equal(f.stats.commits,0);assert.equal(f.stats.processed,0);
 });
 console.log('STUDIO_CONFIGURED_PROMO_INTEGRATION',n,'PASS 0 FAIL');
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
