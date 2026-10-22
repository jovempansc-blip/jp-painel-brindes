'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.join(__dirname,'..'),script=fs.readFileSync(path.join(root,'assets/prog-manual.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(html.includes('assets/prog-manual.js?v=AV58_1_37'));
const date='2026-10-22',monthKey='2026-10';
const copy=v=>JSON.parse(JSON.stringify(v));
const dist=(id,title,ar)=>({id,title,prize:`PREMIO ${id}`,ar,startDate:'2026-10-01',endDate:'2026-10-31',snapshotMonth:monthKey});
const original={distributions:[dist('D_C','CINESYSTEM',5),dist('D_A','ÁGUA MINERAL',4),dist('D_B','BETO CARRERO',1),dist('D_D','ÁRVORE',1)],items:[
  {id:'WIN_1',distributionId:'D_C',date:'2026-10-20',slot:'10H',station:'JP1017',channel:'RÁDIO',qty:1,status:'REALIZADO',winnerName:'GANHADOR EXEMPLO',reuseStatus:'sobra',reuseAt:'2026-10-21T13:00:00Z'},
  ...[1,2,3,4].map(n=>({id:`PREV_${n}`,distributionId:'D_C',date:'2026-10-23',slot:`${String(n+7).padStart(2,'0')}H`,station:'JP1017',channel:'RÁDIO',qty:1,status:'PENDENTE'})),
  ...[1,2,3,4].map(n=>({id:`A_${n}`,distributionId:'D_A',date:'2026-10-23',slot:`${String(n+7).padStart(2,'0')}H`,station:'JP1017',channel:'RÁDIO',qty:1,status:'PENDENTE'})),
  {id:'B_1',distributionId:'D_B',date:'2026-10-23',slot:'09H',station:'JP1017',channel:'RÁDIO',qty:1,status:'PENDENTE'}
],promos:[],manualProgramHistory:[]};
function setup(){
  let remote=copy(original),mutation=()=>{},commits=0;
  const tx={child(){return this;},async transaction(fn){const incoming=copy(remote);mutation(incoming);mutation=()=>{};const result=fn(copy(incoming));if(result===undefined)return{committed:false,snapshot:{val:()=>copy(remote)}};remote=copy(result);commits++;return {committed:true,snapshot:{val:()=>copy(remote)}};}};
  const context={
    JPReturnBalance:require('../assets/return-balance.js'),
    state:{months:{[monthKey]:copy(remote)}},
    window:{alert(m){context.alerts.push(String(m))}},alerts:[],
    document:{readyState:'loading',addEventListener(){},getElementById(){return null}},
    todayISO:()=>date,normalizeSlot:x=>x,
    itemStation:i=>i.station,distributionLabel:d=>d.prize,distStartDate:d=>d.startDate,distEndDate:d=>d.endDate,
    firebaseStateRootRef:()=>tx,firebaseConnected:true,firebaseServerLoaded:true,firebasePendingSave:false,firebaseReady:true,
    confirm:()=>true,toast:()=>{},sameStation:(a,b)=>a===b,
    console:{error(){},warn(){}},Intl,Date,JSON,Math,Map,Set,Array,Object,Number,String
  };
  vm.createContext(context);
  vm.runInContext(script.replace(/\}\)\(\);\s*$/,`window.__test36={init(){date='${date}';draft=snapshot();mode='grade';},getDraft(){return draft;},getCredit:radioReturnCredits,getBalance:balance,getPrize:prizes,stockRows,save};})();`),context);
  context.window.__test36.init();
  return{context,api:context.window.__test36,setRemote(fn){mutation=fn},get remote(){return remote},get commits(){return commits}};
}
(async()=>{
  let t=setup(),api=t.api;
  assert.equal(api.getCredit('D_C'),1,'SOBRA confirmada libera 1 prêmio na competência');
  assert.equal(api.getBalance(api.getPrize().find(d=>d.id==='D_C')),1,'programados 5 / cota 5 / sobra 1 = saldo 1');
  assert.equal(api.getBalance(api.getPrize().find(d=>d.id==='D_A')),0);
  const view=api.stockRows();
  assert(view.indexOf('ÁRVORE')<view.indexOf('CINESYSTEM'),'saldo positivo deve ser ordenado pelo título cadastrado A-Z');
  assert(view.indexOf('CINESYSTEM')<view.indexOf('ÁGUA MINERAL'),'saldo positivo acima de zero mesmo que nome venha depois');
  assert(view.indexOf('ÁGUA MINERAL')<view.indexOf('BETO CARRERO'),'saldos zerados em ordem alfabética');
  assert(view.includes('SOBRA +1')&&view.includes('SALDO 1'));
  api.getDraft().items.push({id:'NEW_1',distributionId:'D_C',date,slot:'16H',station:'JP1017',channel:'RÁDIO',qty:1,status:'PENDENTE'});
  await api.save();assert.equal(t.commits,1,'realocação de 1 sobra deve ser persistida');
  assert.deepEqual(JSON.parse(JSON.stringify(t.remote.items.find(i=>i.id==='NEW_1').returnSourceIds)),['item:WIN_1:0'],'nova realocação deve registrar a origem da sobra consumida');
  assert.equal(api.getBalance(api.getPrize().find(d=>d.id==='D_C')),0,'crédito consumido apenas uma vez');
  api.getDraft().items.push({id:'NEW_2',distributionId:'D_C',date,slot:'17H',station:'JP1017',channel:'RÁDIO',qty:1,status:'PENDENTE'});
  await api.save();assert.equal(t.commits,1,'segunda tentativa sem crédito não é confirmada');
  assert(t.context.alerts.some(m=>m.includes('SALDO INSUFICIENTE')),'recusa sobrecota');
  t=setup();t.api.getDraft().items.push({id:'RACE',distributionId:'D_C',date,slot:'16H',station:'JP1017',channel:'RÁDIO',qty:1,status:'PENDENTE'});
  t.setRemote(m=>{m.items[0].reuseStatus='realocado'});
  await t.api.save();assert.equal(t.commits,0,'SOBRA cancelada em outra sessão não libera crédito');
  t=setup();t.context.state.months[monthKey].items[0].deliveredAt='2026-10-22T13:00:00Z';assert.equal(t.api.getCredit('D_C'),0,'entregue não gera crédito');
  t=setup();t.context.state.months[monthKey].items[0].reuseStatus='realocado';assert.equal(t.api.getCredit('D_C'),0,'reaproveitamento por outra rota não conta como sobra');
  t=setup();delete t.context.state.months[monthKey].items[0].winnerName;assert.equal(t.api.getCredit('D_C'),0,'sem resultado original não existe crédito');
  // Promoções apenas se houver item físico correspondente no mesmo mês.
  t=setup();const m=t.context.state.months[monthKey];
  m.items.push({id:'PR_1',promoId:'P1',sourceType:'promo-result',distributionId:'D_C',date:'2026-10-20',slot:'08H',station:'JP1017',channel:'RÁDIO',qty:1,status:'REALIZADO'});
  m.promos.push({id:'P1',distributionId:'D_C',segmentKey:'ar',resultWinnersByHour:{'2026-10-20-0800':[{name:'EXEMPLO',reuseStatus:'sobra'}]}});
  assert.equal(t.api.getCredit('D_C'),2,'sobra de promoção com lançamento físico verificado');
  m.items=m.items.filter(i=>i.id!=='PR_1');assert.equal(t.api.getCredit('D_C'),1,'promoção virtual não cria saldo fictício');
  console.log('PASS AV58.1.36: retorno SOBRA, saldo, ordenação A-Z, single-use, transação e promo física');
})().catch(err=>{console.error(err);process.exit(1)});
