'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function cut(a,b){
 const s=src.indexOf(a);const e=src.indexOf(b,s+a.length);
 assert(s>=0&&e>s,'Cannot isolate '+a);return src.slice(s,e);
}
const body=cut('function distributionStockUpdateProposal(','function updateDistStockChangePreview(')
 +cut('function distributionStockLedgerFingerprint(','let distributionFormSaving=false;')
 +cut('let distributionFormSaving=false;','let pendingRadioGenerationRequest=null;');
const copy=x=>JSON.parse(JSON.stringify(x));
let total=0;let bad=0;const asyncTests=[];
function test(label,fn){
 const okay=()=>{total++;console.log('PASS',total,label);};
 const failure=err=>{bad++;console.error('FAIL',label,err.stack||err);};
 try{const value=fn();if(value&&typeof value.then==='function')asyncTests.push(value.then(okay,failure));else okay();}catch(e){failure(e);}
}
function env(options={}){
 const channel=options.channel||{ar:35,rua:4,rs:6,app:0,camarote:0,camarim:0};
 const master=180,quota=90;
 const make=(month)=>({id:'DST_TEST',prize:'RADIO CELEBRATE 2026 - MEDUZA',show:'RADIO CELEBRATE',
  date:'2026-10-09',startDate:'2026-10-09',endDate:'2026-11-19',
  title:'PAR DE INGRESSOS - RADIO CELEBRATE',description:'DESCRICAO ORIGINAL',
  titleStyle:{font:'Segoe UI',size:15,color:'#171c26'},descriptionStyle:{font:'Segoe UI',size:11,color:'#566171'},
  ticketDefaultUnit:'unit',ticketUnits:{ar:'pair',rua:'pair',rs:'pair'},
  total:quota,campaignStockTotal:master,masterTotal:master,stockLedger:[],
  app:0,camarote:0,camarim:0,rua:4,ar:35,rs:6,
  reservas:[],reservado:0,reservadoReal:0,monthlyRevision:1,originMonth:'2026-10',snapshotMonth:month,createdAt:'2026-10-01T12:00:00Z'});
 const state={currentMonth:'2026-11',months:{'2026-10':{distributions:[make('2026-10')],items:[],promos:[]},
 '2026-11':{distributions:[make('2026-11')],items:[],promos:[]}},auditLog:[],prizeCatalog:{}};
 const base=copy(state);
 let server=copy(state),flushes=0,renders=0,rollbacks=0,closes=0,alerts=[],toasts=[],statuses=[];
 let receipt=options.receipt===undefined?20:options.receipt;
 const val={
 distId:'DST_TEST',distPrize:'RADIO CELEBRATE 2026 - MEDUZA',distStartDate:'2026-10-09',distEndDate:'2026-11-19',
 distShow:'RADIO CELEBRATE',distTitle:options.newTitle||'PAR DE INGRESSOS - RADIO CELEBRATE',
 distDescription:options.newDescription||'DESCRICAO ORIGINAL',distTotal:options.monthInput===undefined?'90':String(options.monthInput),
 distMasterTotal:String(master+receipt),distStockAdjustmentMode:'current',
 distStockReceiveOrigin:options.origin===undefined?'LOTE TESTE DE NOVEMBRO':options.origin,
 distPrizeType:'ingresso',distTicketDefaultUnit:'unit',distDailyLimit:'1',distEventMode:'standard'
 };
 const button={disabled:false};
 const form={querySelector:()=>button};
 const formElements=Object.fromEntries(Object.entries(val).map(([k,v])=>[k,{value:v}]));
 formElements.distForm=form;
 const go={
  state,window:{JPDistEditor:{status:(...args)=>statuses.push(args)},JPExternalCore:null},
  console:{...console,warn:()=>{}},Math,Number,JSON,String,Date,Object,Set,Map,Array,Promise,
  id:prefix=>prefix+'_'+Math.random().toString(36).slice(2,10),
  $:name=>formElements[name]||null,
  num:value=>Math.max(0,Number(value||0)),norm:value=>String(value||'').trim(),
  textNorm:value=>String(value||'').trim(),clone:copy,
  monthData:()=>state.months[state.currentMonth],
  distributionByIdForMonth:(id,month)=>state.months[month]?.distributions.find(d=>d.id===id),
  distributionCampaignCopies:(id)=>Object.entries(state.months).flatMap(([monthKey,m])=>m.distributions.filter(d=>d.id===id).map(d=>({d,monthKey}))),
  distributionCampaignMasterTotal:d=>d.campaignStockTotal,
  distributionCampaignPlannedTotal:id=>Object.values(state.months).flatMap(m=>m.distributions.filter(d=>d.id===id)).reduce((a,d)=>a+d.total,0),
  selectedRotationSlots:()=>[],promoStyleFromForm:type=>type==='distTitle'?{font:'Segoe UI',size:15,color:'#171c26'}:{font:'Segoe UI',size:11,color:'#566171'},
  collectDistDestinationValues:()=>({...channel, ticketUnits:{ar:'pair',rua:'pair',rs:'pair'},reservado:0,reservadoReal:0,reservas:[],reservadoNote:''}),
  normalizeReservationEntries:d=>d.reservas||[],reservationPackageTotal:d=>0,reservationConsumed:d=>0,
  allocated:d=>['ar','app','rs','rua','camarote','camarim'].reduce((sum,k)=>sum+(d[k]||0)*(d.ticketUnits?.[k]==='pair'?2:1),0),
  allocatedPackages:d=>['ar','app','rs','rua','camarote','camarim'].reduce((sum,k)=>sum+(d[k]||0),0),
  totalDeliverable:d=>d.total,distributionDeliveryLabel:()=> 'INDIVIDUAL',
  validateDistributionCampaignCommitments:()=>[],
  distributionLabel:d=>d.prize,
  labelMonth:()=> 'NOVEMBRO 2026',
  confirm:()=>true,
  alert:t=>alerts.push(String(t)),
  toast:t=>toasts.push(String(t)),
  rememberPrizeCatalog:()=>{},
  syncDistributionToLinkedRadioItems:()=>{},
  storeDistributionAcrossMonths:(d,month,isNew,physical)=>{
    const existing=state.months[month].distributions.find(x=>x.id===d.id);
    Object.assign(existing,copy(d),{campaignStockTotal:physical,masterTotal:physical});
    Object.values(state.months).forEach(m=>m.distributions.forEach(other=>{
      other.campaignStockTotal=physical;other.masterTotal=physical;
      if(other!==existing){for(const key of ['prize','show','date','startDate','endDate','title','description'])other[key]=d[key];}
    }));
  },
  distributionStockLedger:id=>{
    const all=new Map();
    Object.values(state.months).forEach(m=>m.distributions.filter(d=>d.id===id).forEach(d=>(d.stockLedger||[]).forEach(x=>all.set(x.id,x))));
    return [...all.values()];
  },
  pushDistributionStockLedger:(id,event)=>{
    Object.values(state.months).forEach(m=>m.distributions.filter(d=>d.id===id).forEach(d=>d.stockLedger.push(copy(event))));
  },
  currentOperatorIdentity:()=>({name:'TESTE ISOLADO'}),
  auditEvent:(action,name,details)=>{state.auditLog.push({action,target:name,...details});return {id:'AUDIT_'+state.auditLog.length};},
  distributionMonthStockStatus:d=>({planningBalance:d.total-go.allocated(d),executionBalance:d.total,realized:0}),
  distributionCampaignGlobalBalance:d=>({balance:d.campaignStockTotal-go.distributionCampaignPlannedTotal(d.id),master:d.campaignStockTotal,planned:go.distributionCampaignPlannedTotal(d.id)}),
  saveState:()=>!options.saveFails,
  flushFirebaseNow:async()=>{
    flushes++;
    if(options.flushFails)throw Error('FALHA SIMULADA NO FIREBASE');
    server=copy(state);
    if(options.remoteCorruption)server.months['2026-11'].distributions[0].title='ERRO DE SINCRONIZACAO';
  },
  firebaseStateRootRef:()=>({child:path=>({once:async()=>({val:()=>server.months[path.split('/')[1]].distributions})})}),
  firebaseConnected:true,
  firebaseList:rows=>Array.isArray(rows)?rows:Object.values(rows||{}),
  renderDistribuicao:()=>renders++,
  render:()=>renders++,
  closeDrawer:()=>closes++,
  rollbackToFirebaseBaseline:()=>{rollbacks++;state.months=copy(base.months);state.auditLog=copy(base.auditLog);},
 };
 vm.createContext(go);vm.runInContext(body,go);
 return{go,run:()=>go.saveDistributionFromForm(false),get server(){return server;},
  get statuses(){return statuses;},get alerts(){return alerts;},get toasts(){return toasts;},
  get renders(){return renders;},get closes(){return closes;},get rollbacks(){return rollbacks;},
  get flushes(){return flushes;},get state(){return state;},get button(){return button;}};
}
test('salvar acréscimo de 20 unidades e manter a distribuição entre canais',async()=>{
 const e=env({channel:{ar:45,rua:4,rs:6,app:0,camarote:0,camarim:0}});const result=await e.run();
 assert(result,JSON.stringify({alerts:e.alerts,statuses:e.statuses,rollbacks:e.rollbacks,flushes:e.flushes}));assert.equal(e.flushes,1);assert(e.renders>=2);assert.equal(e.closes,1);
 assert.equal(e.server.months['2026-11'].distributions[0].total,110);
 assert.equal(e.server.months['2026-11'].distributions[0].campaignStockTotal,200);
 assert.equal(e.server.months['2026-11'].distributions[0].ar,45);
 assert.equal(e.server.months['2026-11'].distributions[0].rua,4);
 assert.equal(e.server.months['2026-10'].distributions[0].total,90);
 assert.equal(e.server.months['2026-11'].distributions[0].stockLedger.length,1);
 assert.equal(e.server.months['2026-10'].distributions[0].stockLedger.length,1);
 assert(e.statuses.some(x=>x[0]==='saved'));
 assert.equal(e.rollbacks,0);
 assert.equal(e.button.disabled,false);
});
test('salvar edição de título e descrição sincroniza os registros mensais',async()=>{
 const e=env({receipt:0,newTitle:'NOVO TITULO',newDescription:'NOVA DESCRICAO'});
 const result=await e.run();assert(result,JSON.stringify({alerts:e.alerts,statuses:e.statuses}));
 assert.equal(e.server.months['2026-11'].distributions[0].title,'NOVO TITULO');
 assert.equal(e.server.months['2026-10'].distributions[0].title,'NOVO TITULO');
 assert.equal(e.server.months['2026-11'].distributions[0].description,'NOVA DESCRICAO');
});
test('aumentar destinos acima da cota sem novos ingressos é bloqueado',async()=>{
 const e=env({receipt:0,channel:{ar:45,rua:4,rs:6,app:2,camarote:0,camarim:0}});
 const value=await e.run();assert.equal(value,null);assert.equal(e.flushes,0);assert.equal(e.renders,0);
 assert(e.alerts.some(x=>x.includes('ACIMA DA COTA')));
});
test('sem origem de lote, nenhum acréscimo é gravado',async()=>{
 const e=env({origin:''});const value=await e.run();
 assert.equal(value,null);assert.equal(e.flushes,0);assert(e.alerts.some(x=>x.includes('ORIGEM')));
});
test('erro na confirmação reverte valores locais e mostra erro',async()=>{
 const e=env({flushFails:true});const value=await e.run();
 assert.equal(value,null);assert.equal(e.rollbacks,1);assert.equal(e.closes,0);
 assert.equal(e.state.months['2026-11'].distributions[0].total,90);
 assert(e.statuses.some(x=>x[0]==='error'));assert(e.alerts.some(x=>x.includes('NÃO CONFIRMADA')));
 assert.equal(e.button.disabled,false);
});
test('leitura do Firebase divergente bloqueia confirmação falsa',async()=>{
 const e=env({remoteCorruption:true});const value=await e.run();
 assert.equal(value,null);assert.equal(e.rollbacks,1);assert.equal(e.closes,0);
 assert(e.alerts.some(x=>x.includes('FIREBASE')));
});
test('fotografia local desatualizada é bloqueada antes de gravar',async()=>{
 const e=env();
 e.go.state.months['2026-11'].distributions[0].total=88;
 const value=await e.run();assert.equal(value,null);assert.equal(e.flushes,0);assert.equal(e.rollbacks,1,JSON.stringify({alerts:e.alerts,statuses:e.statuses}));
});
(async()=>{await Promise.all(asyncTests);console.log('SAVE-INTEGRATION',total,'PASS',bad,'FAIL');if(bad)process.exitCode=1;})();

