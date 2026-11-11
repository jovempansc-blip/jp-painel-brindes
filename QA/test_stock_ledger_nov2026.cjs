'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const blocks=[
 ['function distributionStockLedger(', 'function renderDistributionStockLedger('],
 ['function renderDistributionStockLedger(', 'function distributionStockUpdateProposal('],
 ['function distributionStockUpdateProposal(', 'function updateDistStockChangePreview('],
 ['function formTotalUnitario(', 'function formDistributableTotal('],
 ['function distributionStockLedgerFingerprint(', 'let distributionFormSaving=false;']
];
const js=blocks.map(([start,end])=>{
 let a=code.indexOf(start),b=code.indexOf(end,a+start.length);
 if(a<0||b<0)throw Error('MISSING BLOCK '+start+' '+end);
 return code.slice(a,b);
}).join('\n');
let passed=0,failed=0;const pending=[];
function check(title,fn){
 const succeed=()=>{passed++;console.log('PASS',passed,title);};
 const fail=e=>{failed++;console.error('FAIL',title,e.stack||e);};
 try{const result=fn();if(result&&typeof result.then==='function')pending.push(result.then(succeed,fail));else succeed();}
 catch(e){fail(e);}
}
const clone=x=>JSON.parse(JSON.stringify(x));
const num=n=>Math.max(0,Number(n||0));
function context(){
 const id='DST_CELEBRATE',oct={id,total:90,campaignStockTotal:180,stockModelVersion:3,
    ar:20,ticketUnits:{ar:'pair'},snapshotMonth:'2026-10',startDate:'2026-10-09',endDate:'2026-11-19'},
 nov={...clone(oct),snapshotMonth:'2026-11',ar:45};
 const state={currentMonth:'2026-11',months:{'2026-10':{distributions:[oct],items:[]},
     '2026-11':{distributions:[nov],items:[]}},auditLog:[]};
 const fields={distId:{value:id},distTotal:{value:'90'},distMasterTotal:{value:'180'},distStockAdjustmentMode:{value:'current'},distStockHistory:{innerHTML:'',addEventListener(){}}};
 const alerts=[];
 const c={state,num,clone,console,Date,Math,JSON,Set,Map,Promise,
  '$':name=>fields[name],fields,alerts,
  esc:value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;'),
  id:prefix=>prefix+'_'+Math.random().toString(36).slice(2),
  norm:x=>String(x||'').trim(),currentOperatorIdentity:()=>({name:'TESTE ISOLADO'}),
  distributionCampaignCopies:distId=>Object.entries(state.months).flatMap(([monthKey,m])=>m.distributions.filter(d=>d.id===distId).map(d=>({monthKey,d}))),
  distributionByIdForMonth:(distId,monthKey)=>state.months[monthKey]?.distributions.find(d=>d.id===distId),
  distributionById:distId=>state.months[state.currentMonth]?.distributions.find(d=>d.id===distId),
  distributionCampaignMasterTotal:()=>state.months['2026-11'].distributions[0].campaignStockTotal,
  distributionCampaignPlannedTotal:()=>Object.values(state.months).flatMap(m=>m.distributions).reduce((n,d)=>n+d.total,0),
  allocated:d=>num(d.ar)*2+num(d.rs)+num(d.app)+num(d.rua)+num(d.camarote)+num(d.camarim),
  normalizeStatus:x=>x,
  ticketMultiplier:()=>2,
  distributionMonthStockStatus:(d,monthKey)=>({realized:state.months[monthKey].items.filter(i=>i.status==='REALIZADO').reduce((n,i)=>n+num(i.stockUnits||1),0)}),
  distributionLabel:()=> 'RÁDIO CELEBRATE 2026',
  propagateCampaignMasterTotal:(distId,value)=>Object.values(state.months).forEach(m=>m.distributions.filter(d=>d.id===distId).forEach(d=>d.campaignStockTotal=value)),
  auditEvent:(action,target,details)=>{state.auditLog.push({action,target,...details});},
  firebaseReady:true,firebaseRef:{},firebaseConnected:true,firebaseServerLoaded:true,distributionFormSaving:false,
  firebaseList:value=>Array.isArray(value)?value.filter(Boolean):Object.values(value||{}),
  alert:value=>alerts.push(String(value)),confirm:()=>true,saveState:()=>true,
  flushFirebaseNow:async()=>{c.server=clone(state);},
  firebaseStateRootRef:()=>({child:raw=>({once:async()=>({val:()=>c.server.months[raw.split('/')[1]].distributions})})}),
  render:()=>{},editDist:()=>{},toast:()=>{},rollbackToFirebaseBaseline:()=>{c.rolledBack=true},
  rolledBack:false,server:clone(state)
 };
 vm.createContext(c);vm.runInContext(js,c);
 return c;
}
const receipt=(c,p=20,m=20)=>({id:'STK_1',kind:'ADDITION',distId:'DST_CELEBRATE',monthKey:'2026-11',
 physicalDelta:p,monthDelta:m,origin:'PRODUÇÃO P12',createdAt:'2026-11-11T12:00:00Z',operatorName:'TESTE'});
check('base: 180 fisicas, 90 mes, 45 pares = 90 unidades destinadas',()=>{
 const c=context(),d=c.distributionById('DST_CELEBRATE');
 assert.equal(c.distributionCampaignMasterTotal(),180);
 assert.equal(d.total,90);assert.equal(c.allocated(d),90);assert.equal(d.total-c.allocated(d),0);
});
check('recebimento +20 em novembro produz cota 110 e fisico 200',()=>{
 const c=context(),d=c.distributionById('DST_CELEBRATE');
 assert.equal(c.distributionStockUpdateProposal(d,90,200,'current').monthTotal,110);
});
check('recebimento no global preserva cota 90',()=>{
 const c=context();assert.equal(c.distributionStockUpdateProposal(c.distributionById('DST_CELEBRATE'),90,200,'global').monthTotal,90);
});
check('edicao manual de quota com aumento fisico e respeitada',()=>{
 const c=context();assert.equal(c.distributionStockUpdateProposal(c.distributionById('DST_CELEBRATE'),105,200,'current').monthTotal,105);
});
check('reducao direta de estoque fora do estorno e bloqueada',()=>{
 const c=context();assert.throws(()=>c.distributionStockUpdateProposal(c.distributionById('DST_CELEBRATE'),90,170,'global'),/ESTORNAR ACRÉSCIMO/);
});
check('formulario calcula novo saldo imediatamente apos receber',()=>{
 const c=context();c.fields.distMasterTotal.value='200';
 assert.equal(c.formTotalUnitario(),110);
 assert.equal(Math.floor(c.formTotalUnitario()/2),55);
});
check('soma do estoque e da cota nao implica alocacao automatica em canal',()=>{
 const c=context();c.fields.distMasterTotal.value='200';const d=c.distributionById('DST_CELEBRATE');
 assert.equal(c.formTotalUnitario()-c.allocated(d),20);assert.equal(d.ar,45);
});
check('historico append-only replica mesmo lancamento em todos os meses',()=>{
 const c=context(),r=receipt(c);c.pushDistributionStockLedger(r.distId,r);
 assert.equal(c.distributionStockLedger(r.distId).length,1);
 for(const m of Object.values(c.state.months))assert.equal(m.distributions[0].stockLedger[0].id,r.id);
});
check('repeticao do mesmo ID de lancamento bloqueada',()=>{
 const c=context(),r=receipt(c);c.pushDistributionStockLedger(r.distId,r);
 assert.throws(()=>c.pushDistributionStockLedger(r.distId,r),/JÁ EXISTENTE/);
});
check('estorno integral aprovado quando acrescimo esta livre',()=>{
 const c=context(),r=receipt(c);c.state.months['2026-11'].distributions[0].total=110;
 c.propagateCampaignMasterTotal(r.distId,200);c.pushDistributionStockLedger(r.distId,r);
 const v=c.stockReversalCheck(r);assert.equal(v.ok,true);assert.equal(v.quotaAfter,90);assert.equal(v.masterAfter,180);
});
check('estorno bloqueado se 10 pares adicionais ja destinados ao radio',()=>{
 const c=context(),r=receipt(c);const d=c.distributionById(r.distId);
 d.total=110;d.ar=55;c.propagateCampaignMasterTotal(r.distId,200);
 c.pushDistributionStockLedger(r.distId,r);assert.match(c.stockReversalCheck(r).reason,/COTA JÁ DESTINADA/);
});
check('estorno bloqueado se cota remanescente nao cobre sorteios realizados',()=>{
 const c=context(),r=receipt(c);const d=c.distributionById(r.distId);
 d.total=110;c.propagateCampaignMasterTotal(r.distId,200);
 c.state.months['2026-11'].items.push({id:'REAL',distributionId:r.distId,date:'2026-11-08',status:'REALIZADO',stockUnits:92});
 c.pushDistributionStockLedger(r.distId,r);assert.match(c.stockReversalCheck(r).reason,/REALIZADOS/);
});
check('estorno bloqueado se outro sorteio futuro ja esta programado',()=>{
 const c=context(),r=receipt(c);const d=c.distributionById(r.distId);
 d.total=110;c.propagateCampaignMasterTotal(r.distId,200);
 c.state.months['2026-11'].items.push({id:'FUTURE',distributionId:r.distId,date:'2026-11-12',status:'PENDENTE',stockUnits:95});
 c.pushDistributionStockLedger(r.distId,r);assert.match(c.stockReversalCheck(r).reason,/PROGRAMADOS/);
});
check('estorno bloqueado se queda do estoque deixa deficit intermensal',()=>{
 const c=context(),r=receipt(c,20,0);c.propagateCampaignMasterTotal(r.distId,200);
 c.state.months['2026-10'].distributions[0].total=100; // total planned 190, after removal 180
 c.pushDistributionStockLedger(r.distId,r);assert.match(c.stockReversalCheck(r).reason,/COTAS MENSAIS/);
});
check('lancamento sem stock pode representar realocacao de cota',()=>{
 const c=context(),r=receipt(c,0,10);const d=c.distributionById(r.distId);
 d.total=100;c.propagateCampaignMasterTotal(r.distId,190);
 c.pushDistributionStockLedger(r.distId,r);
 assert.equal(c.stockReversalCheck(r).ok,true);
});
check('segundo estorno e recusado sem apagar primeiro',()=>{
 const c=context(),r=receipt(c);const d=c.distributionById(r.distId);
 d.total=110;c.propagateCampaignMasterTotal(r.distId,200);
 c.pushDistributionStockLedger(r.distId,r);
 c.pushDistributionStockLedger(r.distId,{id:'REV_1',kind:'REVERSAL',distId:r.distId,monthKey:r.monthKey,physicalDelta:-20,monthDelta:-20,reversalOf:r.id,createdAt:'2026-11-11T12:01:00Z'});
 assert.match(c.stockReversalCheck(r).reason,/JÁ ESTORNADO/);
});
check('historico visivel mostra origem, competencia, unidades, botao de estorno',()=>{
 const c=context(),r=receipt(c);const d=c.distributionById(r.distId);
 d.total=110;c.propagateCampaignMasterTotal(r.distId,200);c.pushDistributionStockLedger(r.distId,r);
 c.renderDistributionStockLedger(r.distId);
 const html=c.fields.distStockHistory.innerHTML;
 assert.match(html,/PRODUÇÃO P12/);assert.match(html,/2026-11/);assert.match(html,/ESTORNAR ACRÉSCIMO/);
});
check('leitura independente do Firebase valida historico e ambos meses',async()=>{
 const c=context(),r=receipt(c);c.pushDistributionStockLedger(r.distId,r);c.server=clone(c.state);
 assert.equal(await c.hotfixVerifyPrizeWrite(r.distId),true);
});
check('comparacao do ledger independe da ordem dos campos JSON',async()=>{
 const c=context(),r=receipt(c);c.pushDistributionStockLedger(r.distId,r);c.server=clone(c.state);
 const source=c.server.months['2026-10'].distributions[0].stockLedger[0];
 c.server.months['2026-10'].distributions[0].stockLedger[0]=Object.fromEntries(Object.entries(source).reverse());
 assert.equal(await c.hotfixVerifyPrizeWrite(r.distId),true);
});
check('estorno negativo aparece como -20 no extrato sem usar num() que zera negativos',()=>{
 const c=context(),r=receipt(c);const d=c.distributionById(r.distId);
 d.total=110;c.propagateCampaignMasterTotal(r.distId,200);c.pushDistributionStockLedger(r.distId,r);
 c.pushDistributionStockLedger(r.distId,{id:'REV_1',kind:'REVERSAL',distId:r.distId,monthKey:r.monthKey,
 physicalDelta:-20,monthDelta:-20,reversalOf:r.id,origin:'ESTORNO',createdAt:'2026-11-11T12:01:00Z'});
 c.renderDistributionStockLedger(r.distId);
 assert.match(c.fields.distStockHistory.innerHTML,/FÍSICO -20 UNID/);
});
check('leitura independente detecta historico divergente em outro mes',async()=>{
 const c=context(),r=receipt(c);c.pushDistributionStockLedger(r.distId,r);c.server=clone(c.state);
 c.server.months['2026-10'].distributions[0].stockLedger=[];
 await assert.rejects(c.hotfixVerifyPrizeWrite(r.distId),/GRAVAÇÃO NÃO CONFERIU/);
});
check('estorno impede escrita quando Firebase difere da tela',async()=>{
 const c=context(),r=receipt(c);const d=c.distributionById(r.distId);
 d.total=110;c.propagateCampaignMasterTotal(r.distId,200);c.pushDistributionStockLedger(r.distId,r);
 // Server snapshot remains at 90/180 despite local 110/200.
 await c.reverseDistributionStockAddition(r.id);
 assert.equal(c.distributionById(r.distId).total,110);
 assert.equal(c.rolledBack,true);
 assert(c.alerts.some(x=>x.includes('ESTORNO NÃO CONFIRMADO')));
});
check('reversao com gravacao simulada gera movimento negativo preservando origem',async()=>{
 const c=context(),r=receipt(c);const d=c.distributionById(r.distId);
 d.total=110;c.propagateCampaignMasterTotal(r.distId,200);
 c.pushDistributionStockLedger(r.distId,r);c.server=clone(c.state);
 await c.reverseDistributionStockAddition(r.id);
 assert.equal(c.distributionById(r.distId).total,90);
 assert.equal(c.distributionCampaignMasterTotal(),180);
 const ledger=c.distributionStockLedger(r.distId);
 assert.equal(ledger.length,2);assert.equal(ledger[1].kind,'REVERSAL');assert.equal(ledger[1].reversalOf,r.id);
 assert.equal(c.rolledBack,false);
});
(async()=>{
 await Promise.all(pending);
 console.log('RESULT',passed,'PASS',failed,'FAIL');
 if(failed)process.exitCode=1;
})();

