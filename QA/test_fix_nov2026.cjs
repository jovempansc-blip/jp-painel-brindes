const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const dir=path.resolve(__dirname,'..'),src=fs.readFileSync(path.join(dir,'index.html'),'utf8'),rec=fs.readFileSync(path.join(dir,'preview_recepcao.html'),'utf8');
let checks=0;const test=async(name,fn)=>{await fn();console.log('PASS',++checks,name);};
function cut(str,start,end){const a=str.indexOf(start);assert(a>=0,start);const b=str.indexOf(end,a);assert(b>a,end);return str.slice(a,b);}
function stockCtx(){
 const code=cut(src,'function distributionStockUpdateProposal(','function updateDistStockChangePreview(');
 const ctx=vm.createContext({distributionCampaignMasterTotal:x=>x.master,num:x=>Number(x)||0});
 vm.runInContext(code,ctx);return ctx.distributionStockUpdateProposal;
}
function inlineCtx({value='15',initial=10,total=30,saveFails=false,remoteValue=null,external=false}={}){
 const code=cut(src,'const distributionInlineSaving=new Set();',"$('saveReserveNoteBtn').addEventListener");
 const alerts=[],toasts=[],audits=[],stats={save:0,flush:0,rollback:0,renders:0};
 const d={id:'DST_TESTE',app:initial,camarote:0,camarim:0,rua:0,ar:0,rs:0,total,externalActions:external?{ext:{quantity:1}}:{}};
 const input={value,dataset:{distId:d.id,key:'app'},disabled:false};
 const fakeTable={addEventListener(){}};
 const ctx=vm.createContext({
   $:id=>id==='distTable'?fakeTable:null,
   state:{currentMonth:'2026-11'},window:{JPExternalCore:null},document:{},
   distributionById:id=>id===d.id?d:null,
   num:x=>Number(x)||0,clone:x=>JSON.parse(JSON.stringify(x)),
   allocated:x=>x.app+x.camarote+x.camarim+x.rua+x.ar+x.rs,
   distributionDeliveryUnit:()=> 'unit',
   firebaseReady:true,firebaseRef:{},firebaseConnected:true,firebaseServerLoaded:true,
   auditEvent:(...args)=>audits.push(args),distributionLabel:()=> 'INGRESSOS TESTE',
   saveState:()=>{stats.save++;return true;},
   flushFirebaseNow:async()=>{stats.flush++;if(saveFails)throw Error('FALHA SIMULADA');},
   firebaseStateRootRef:()=>({child:()=>({once:async()=>({val:()=>[{...d,app:remoteValue===null?d.app:remoteValue}]})})}),
   firebaseList:x=>x,renderDistribuicao:()=>stats.renders++,
   toast:x=>toasts.push(x),alert:x=>alerts.push(x),
   rollbackToFirebaseBaseline:()=>stats.rollback++,
   validateDistributionCampaignCommitments:()=>[],handleRadioScheduleAfterSave:()=>true,radioPlannerNeeded:()=>0,
   openRadioPlanner:()=>{},console
 });
 vm.runInContext(code,ctx);
 return{run:()=>ctx.commitDistributionInlineNumber(input),stats,d,input,alerts,toasts,audits};
}
(async()=>{
 await test('Recepção inicializa JS ativo com configuração do painel oficial',()=>{
  assert(rec.includes('type="text/javascript"'));
  assert(!rec.includes('application/x-av60-hml'));
  assert(rec.includes('assets/jp-reception-config.js'));
  assert(!rec.includes('assets/av60-hml-auth.js'));
  const config=fs.readFileSync(path.join(dir,'assets/jp-reception-config.js'),'utf8');
  assert(config.includes('JP_RECEPTION_FIREBASE_CONFIG'));
  assert(config.includes('jp-painel-brindes-default-rtdb.firebase'));
 });
 await test('Recepção externa continua protegida por bloqueio independente até QA',()=>{
  const bridge=fs.readFileSync(path.join(dir,'assets/jp-promo-externa-reception-bridge.js'),'utf8');
  assert(bridge.includes('JP_EXT_SECURE_BANK_VERIFIED===true'));
  assert(bridge.includes('auth.onAuthStateChanged'));
  assert(bridge.includes('data-ext-pickup'));
  assert(bridge.includes('retryBankSync'));
  assert(bridge.includes("onMonths(data=>"));
  assert(bridge.includes("bankRef.on('value'"));
  const env=fs.readFileSync(path.join(dir,'assets/jp-promo-externa-env.js'),'utf8');
  assert(env.includes('JP_EXT_SECURE_BANK_VERIFIED = false'));
 });
 await test('recebimento adicional em modo competência aumenta cota mensal e estoque global',()=>{
  const f=stockCtx(),r=f({total:10,master:20},10,25,'current');
  assert.equal(r.monthTotal,15);assert.equal(r.masterTotal,25);assert.equal(r.increase,5);
  const global=f({total:10,master:20},10,25,'global');
  assert.equal(global.monthTotal,10);
 });
 await test('edição em linha só grava valor inteiro completo',async()=>{
  const t=inlineCtx({value:'15'});
  await t.run();
  assert.equal(t.d.app,15);assert.equal(t.stats.save,1);
  assert.equal(t.stats.flush,1);assert.equal(t.stats.rollback,0);
  assert.equal(t.stats.renders,1);
 });
 await test('edição inválida é recusada sem salvar',async()=>{
  const t=inlineCtx({value:'1.5'});await t.run();
  assert.equal(t.d.app,10);assert.equal(t.stats.save,0);assert(t.alerts.length);
 });
 await test('aumento que cria déficit de estoque é recusado',async()=>{
  const t=inlineCtx({value:'40',total:30});await t.run();
  assert.equal(t.stats.save,0);assert.equal(t.d.app,10);
 });
 await test('falha de confirmação restaura baseline e alerta o operador',async()=>{
  const t=inlineCtx({saveFails:true});await t.run();
  assert.equal(t.stats.save,1);assert.equal(t.stats.rollback,1);assert(t.alerts.length);
 });
 await test('falha em leitura independente bloqueia falsa confirmação',async()=>{
  const t=inlineCtx({remoteValue:10});await t.run();
  assert.equal(t.stats.rollback,1);assert(t.alerts.length);
 });
 await test('cota mensal não pode diminuir no formulário',()=>{
  assert(src.includes("if(d.total<proposal.oldMonth){alert('A COTA MENSAL NÃO PODE SER REDUZIDA"));
 });
 console.log('SUMMARY',checks,'/',9,'PASS');
})().catch(err=>{console.error(err);process.exitCode=1;});
