const assert=require('node:assert/strict');
const C=require('../assets/jp-promo-externa-core.js');
global.JPExternalCore=C;
const Store=require('../assets/jp-promo-externa-firebase.js');
const dup=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
const initial=()=>({id:'D_P12',prize:'INGRESSOS P12',title:'PAR DE INGRESSOS',startDate:'2026-11-01',endDate:'2026-11-30',rua:50,ticketUnits:{rua:'pair'},total:100,ar:0});
function mockDB(){
 const data={'jp-painel-brindes':{state:{months:{'2026-11':{distributions:[initial()],items:[],promos:[]}}},winnerBank:{records:{},pendingExternal:{}}}};
 const trace=[];
 const resolve=(path,create=false)=>{
   const parts=path.split('/').filter(Boolean);let dest=data;
   for(let i=0;i<parts.length-1;i++){if(dest[parts[i]]==null&&create)dest[parts[i]]={}; dest=dest[parts[i]];if(dest==null)return [undefined,parts.at(-1)];}
   return [dest,parts.at(-1)];
 };
 const ref=path=>({
   child(sub){return ref(path+'/'+sub);},
   async get(){const [parent,key]=resolve(path);return{val:()=>dup(parent?.[key]??null)};},
   async set(value){trace.push(['set',path]);const [parent,key]=resolve(path,true);parent[key]=dup(value);},
   async remove(){trace.push(['remove',path]);const [parent,key]=resolve(path);if(parent)delete parent[key];},
   async update(updates){trace.push(['update',path]);const [parent,key]=resolve(path,true);parent[key]={...parent[key],...dup(updates)};},
   async transaction(fn){trace.push(['tx',path]);const [parent,key]=resolve(path,true);let value=fn(dup(parent[key]??null));if(value===undefined)return{committed:false,snapshot:{val:()=>dup(parent[key])}};
     parent[key]=dup(value);return{committed:true,snapshot:{val:()=>dup(value)}};}
 });
 return{ref,data,trace};
}
const DAY='2026-11-11';let cases=0;
const test=(title,fn)=>Promise.resolve().then(fn).then(()=>{cases++;console.log('PASS',cases,title)});
(async()=>{
 await test('50 pares da cota Externa = 100 unidades físicas',()=>{const d=initial();assert.equal(C.quotaUnits(d),100);assert.equal(C.remainingUnallocated(d),100)});
 await test('primeira ação de 40 pares reserva 80 unidades, sem modificar a cota',()=>{const d=initial();let x=C.createAction([d],{month:'2026-11',distributionId:d.id,id:'A1',title:'Promo externa P12',startsOn:DAY,endsOn:'2026-11-20',quantity:40});assert.equal(x.rows[0].rua,50);assert.equal(C.remainingUnallocated(x.rows[0]),20);});
 await test('segunda ação não pode reservar acima da mesma cota',()=>{let d=initial();let x=C.createAction([d],{month:'2026-11',distributionId:d.id,id:'A1',title:'Promo externa P12',startsOn:DAY,endsOn:'2026-11-20',quantity:40});assert.throws(()=>C.createAction(x.rows,{month:'2026-11',distributionId:d.id,id:'A2',title:'Evento Parceiro',startsOn:DAY,endsOn:'2026-11-20',quantity:11}),/INSUFICIENTE/)});
 await test('datas fora da vigência bloqueadas',()=>{const d=initial();assert.throws(()=>C.createAction([d],{month:'2026-11',distributionId:d.id,title:'Promo incorreta',startsOn:'2026-10-01',endsOn:DAY,quantity:1}),/ANTES/);});
 await test('sorteio do locutor consome apenas a quantidade da ação',()=>{const d=initial();let r=C.createAction([d],{month:'2026-11',distributionId:d.id,id:'A1',title:'Promo externa P12',startsOn:DAY,endsOn:'2026-11-20',quantity:3});let w=C.registerWinner(r.rows,{distributionId:d.id,actionId:'A1',id:'W1',name:'João da Silva',phone:'48999999999',quantity:1},{day:DAY,serverTimestamp:1794410000000});assert.equal(C.balanceUnits(w.rows[0].externalActions.A1),4);assert.equal(w.rows[0].rua,50);});
 await test('telefone e nome não são gravados no nó de distribuição',()=>{const d=initial();let r=C.createAction([d],{month:'2026-11',distributionId:d.id,id:'A1',title:'Promo externa P12',startsOn:DAY,endsOn:'2026-11-20',quantity:3});let w=C.registerWinner(r.rows,{distributionId:d.id,actionId:'A1',id:'W1',name:'João da Silva',phone:'48999999999',quantity:1},{day:DAY});assert(!JSON.stringify(w.rows).includes('JOÃO'));assert(!JSON.stringify(w.rows).includes('48999999999'));assert.equal(w.created.name,'JOÃO DA SILVA');});
 await test('ação encerrada não recebe novos ganhadores',()=>{const d=initial();let r=C.createAction([d],{month:'2026-11',distributionId:d.id,id:'A1',title:'Promo externa P12',startsOn:DAY,endsOn:'2026-11-20',quantity:3});assert.throws(()=>C.registerWinner(r.rows,{distributionId:d.id,actionId:'A1',id:'W1',name:'João da Silva',phone:'48999999999'},{day:'2026-11-21'}),/NÃO ESTÁ ATIVA/)});
 await test('não é possível dar baixa antes da conciliação no Banco Central',()=>{const d=initial();let r=C.createAction([d],{month:'2026-11',distributionId:d.id,id:'A1',title:'Promo externa P12',startsOn:DAY,endsOn:'2026-11-20',quantity:3});let w=C.registerWinner(r.rows,{distributionId:d.id,actionId:'A1',id:'W1',name:'João da Silva',phone:'48999999999'},{day:DAY});assert.throws(()=>C.registerPickup(w.rows,{distributionId:d.id,actionId:'A1',winnerId:'W1'}),/BANCO CENTRAL/)});
 await test('retirada depois da conciliação não desconta duas vezes',()=>{let x=C.createAction([initial()],{month:'2026-11',distributionId:'D_P12',id:'A1',title:'Promo externa P12',startsOn:DAY,endsOn:'2026-11-20',quantity:3});let w=C.registerWinner(x.rows,{distributionId:'D_P12',actionId:'A1',id:'W1',name:'João da Silva',phone:'48999999999'},{day:DAY});let ready=C.setBankStatus(w.rows,{distributionId:'D_P12',actionId:'A1',winnerId:'W1',status:'CONFIRMADO'});let n=C.consumedUnits(ready[0].externalActions.A1);let done=C.registerPickup(ready,{distributionId:'D_P12',actionId:'A1',winnerId:'W1'},{operator:'RECEPÇÃO'});assert.equal(C.consumedUnits(done.rows[0].externalActions.A1),n);assert.throws(()=>C.registerPickup(done.rows,{distributionId:'D_P12',actionId:'A1',winnerId:'W1'}),/JÁ REGISTRADA/)});
 await test('cancelar registro pendente devolve uma unidade de ação sem aumentar estoque',()=>{let x=C.createAction([initial()],{month:'2026-11',distributionId:'D_P12',id:'A1',title:'Promo externa P12',startsOn:DAY,endsOn:'2026-11-20',quantity:3});let w=C.registerWinner(x.rows,{distributionId:'D_P12',actionId:'A1',id:'W1',name:'João da Silva',phone:'48999999999'},{day:DAY});let c=C.cancelWinner(w.rows,{distributionId:'D_P12',actionId:'A1',winnerId:'W1'});assert.equal(C.balanceUnits(c[0].externalActions.A1),6);assert.equal(c[0].rua,50);});
 await test('RTDB: dois clientes não conseguem exceder o saldo',async()=>{
  const db=mockDB(),a=new Store(db,{auth:{currentUser:{uid:'A'}},secureBankVerified:true}),b=new Store(db,{auth:{currentUser:{uid:'B'}},secureBankVerified:true});
  const act=await a.createAction({month:'2026-11',distributionId:'D_P12',id:'AA',title:'Promo P12',startsOn:DAY,endsOn:'2026-11-20',quantity:1},'DIREÇÃO');
  assert.equal(act.allocatedUnits,2);
  global.firebase={database:Object.assign(function(){},{ServerValue:{TIMESTAMP:1794410000000}})};
  const first=await a.registerWinner({month:'2026-11',distributionId:'D_P12',actionId:'AA',id:'W1',name:'Pessoa Número Um',phone:'48999999999'},'LOCUTOR 1');
  assert.equal(first.bankSynced,true);assert.equal(db.data['jp-painel-brindes'].winnerBank.records.EXTERNA_W1.name,'PESSOA NÚMERO UM');
  let conflict='';try{await b.registerWinner({month:'2026-11',distributionId:'D_P12',actionId:'AA',id:'W2',name:'Pessoa Número Dois',phone:'48888888888'},'LOCUTOR 2');}catch(e){conflict=e.message;}
  assert.match(conflict,/SALDO DA AÇÃO INSUFICIENTE/);
  const real=db.data['jp-painel-brindes'].state.months['2026-11'].distributions[0];
  assert.equal(Object.keys(real.externalActions.AA.winners).length,1);
 });
 await test('RTDB: ganhador aparece na mesma origem da Recepção com hora do servidor',async()=>{const db=mockDB();const a=new Store(db,{auth:{currentUser:{uid:'ONE'}},secureBankVerified:true});global.firebase={database:Object.assign(function(){},{ServerValue:{TIMESTAMP:1794410000000}})};await a.createAction({month:'2026-11',distributionId:'D_P12',id:'AA',title:'Promo P12',startsOn:DAY,endsOn:'2026-11-20',quantity:3},'DIREÇÃO');await a.registerWinner({month:'2026-11',distributionId:'D_P12',actionId:'AA',id:'W1',name:'Pessoa Número Um',phone:'48999999999'},'LOCUTOR');const month=await a.allMonths();const rows=C.flatten(month);assert.equal(rows[0].winners[0].registeredAtMs,1794410000000);assert.equal(rows[0].winners[0].bankStatus,'CONFIRMADO');});
 await test('RTDB: autenticação é obrigatória para criar ação e registrar',async()=>{const db=mockDB();let err='';try{await new Store(db,{auth:{currentUser:null},secureBankVerified:true}).createAction({month:'2026-11',distributionId:'D_P12',title:'Promo P12',startsOn:DAY,endsOn:'2026-11-20',quantity:2},'DIREÇÃO')}catch(e){err=e.message;}assert.match(err,/AUTENTICAÇÃO/);assert.equal(db.trace.filter(x=>x[0]==='tx').length,0);});
 await test('integração no Principal preserva objeto externalActions ao editar prêmio',()=>{const fs=require('node:fs');const html=fs.readFileSync(require('node:path').resolve(__dirname,'../index.html'),'utf8');assert(html.includes('d.externalActions=clone(existing.externalActions||{})'));assert(html.includes('C.actionReservedUnits(existing)'));assert(html.includes('if(source?.snapshotMonth && source.snapshotMonth!==monthKey) copy.externalActions={}'));});
 await test('PILOTO: cadastro nominal fictício sem login grava no Banco de Ganhadores',async()=>{
  const db=mockDB(),store=new Store(db,{pilotMode:true,auth:null,secureBankVerified:false});
  global.firebase={database:Object.assign(function(){},{ServerValue:{TIMESTAMP:1794410000000}})};
  const act=await store.createAction({month:'2026-11',distributionId:'D_P12',id:'PILOT_A',title:'AÇÃO PILOTO TESTE',startsOn:DAY,endsOn:'2026-11-20',quantity:2},'LOCUTOR PILOTO');
  assert.equal(act.allocatedUnits,4);
  const w=await store.registerWinner({month:'2026-11',distributionId:'D_P12',actionId:'PILOT_A',id:'PILOT_W',name:'Pessoa Fictícia Teste',phone:'48999999999',cpf:'52998224725'},'OPERADOR PILOTO');
  assert.equal(w.bankSynced,true);
  assert.equal(db.data['jp-painel-brindes'].winnerBank.records.EXTERNA_PILOT_W.name,'PESSOA FICTÍCIA TESTE');
  assert.equal(db.data['jp-painel-brindes'].winnerBank.records.EXTERNA_PILOT_W.cpf,'52998224725');
  const d=db.data['jp-painel-brindes'].state.months['2026-11'].distributions[0];
  assert(!JSON.stringify(d).includes('52998224725'),'CPF should not be written to distribution allocation');
  const done=await store.pickup({month:'2026-11',distributionId:'D_P12',actionId:'PILOT_A',winnerId:'PILOT_W'},'RECEPÇÃO PILOTO');
  assert.equal(done.status,'RETIRADO');
  assert.equal(db.data['jp-painel-brindes'].winnerBank.records.EXTERNA_PILOT_W.deliveryStatus,'RETIRADO');
 });
 await test('PILOTO: saldo continua transacional e não duplica premiação sem login',async()=>{
  const db=mockDB(),a=new Store(db,{pilotMode:true}),b=new Store(db,{pilotMode:true});
  await a.createAction({month:'2026-11',distributionId:'D_P12',id:'ACTION_1',title:'TESTE SINTÉTICO',startsOn:DAY,endsOn:'2026-11-20',quantity:1},'PILOTO');
  await a.registerWinner({month:'2026-11',distributionId:'D_P12',actionId:'ACTION_1',id:'W_1',name:'Pessoa Fictícia Um',phone:'48999999999'},'PILOTO');
  await assert.rejects(b.registerWinner({month:'2026-11',distributionId:'D_P12',actionId:'ACTION_1',id:'W_2',name:'Pessoa Fictícia Dois',phone:'48988888888'},'PILOTO'),/SALDO DA AÇÃO INSUFICIENTE/);
 });

 await test('ACOMPANHANTE: campos vazios são opcionais e nome completo é obrigatório quando informado',()=>{
  assert.equal(C.companionDetails({name:'',phone:'',cpf:''}),null);
  assert.throws(()=>C.companionDetails({name:'Pessoa',phone:'',cpf:''}),/NOME COMPLETO/);
  assert.equal(C.companionDetails({name:'Pessoa Fictícia',phone:'',cpf:''}).name,'PESSOA FICTÍCIA');
 });
 await test('ACOMPANHANTE: CPF opcional e validado se preenchido',()=>{
  assert.equal(C.companionDetails({name:'Pessoa Fictícia',cpf:''}).name,'PESSOA FICTÍCIA');
  assert.throws(()=>C.companionDetails({name:'Pessoa Fictícia',cpf:'12345678901'}),/CPF DO ACOMPANHANTE INVÁLIDO/);
  assert.equal(C.companionDetails({name:'Pessoa Fictícia',cpf:'529.982.247-25'}).cpf,'52998224725');
 });
 await test('ACOMPANHANTE: um par é gravado no mesmo registro do ganhador sem consumir outra cota',async()=>{
  const db=mockDB(),s=new Store(db,{pilotMode:true});global.firebase={database:Object.assign(function(){},{ServerValue:{TIMESTAMP:1794410000000}})};
  await s.createAction({month:'2026-11',distributionId:'D_P12',id:'PAIR_A',title:'Par Fictício',startsOn:DAY,endsOn:'2026-11-20',quantity:3},'PILOTO');
  const winner=await s.registerWinner({month:'2026-11',distributionId:'D_P12',actionId:'PAIR_A',id:'PAIR_W',name:'Titular Fictício',phone:'48999999999',companion:{name:'Acompanhante Fictício',phone:'48988888888',cpf:'52998224725'}},'ESTÚDIO');
  assert.equal(winner.bankSynced,true);
  const bank=db.data['jp-painel-brindes'].winnerBank.records.EXTERNA_PAIR_W;
  assert.equal(bank.companion.name,'ACOMPANHANTE FICTÍCIO');
  assert.equal(bank.companion.phone,'48988888888');
  assert.equal(bank.companion.cpf,'52998224725');
  const dist=db.data['jp-painel-brindes'].state.months['2026-11'].distributions[0];
  assert.equal(Object.keys(dist.externalActions.PAIR_A.winners).length,1);
  assert.equal(C.consumedUnits(dist.externalActions.PAIR_A),2);
  assert(!JSON.stringify(dist).includes('ACOMPANHANTE FICTÍCIO'));
  assert(!JSON.stringify(dist).includes('52998224725'));
 });
 await test('ACOMPANHANTE: prêmio individual rejeita segundo ingresso',async()=>{
  const db=mockDB(),s=new Store(db,{pilotMode:true});global.firebase={database:Object.assign(function(){},{ServerValue:{TIMESTAMP:1794410000000}})};
  const data=db.data['jp-painel-brindes'].state.months['2026-11'].distributions[0];
  data.ticketUnits={rua:'unit'};data.total=50;
  const act=await s.createAction({month:'2026-11',distributionId:'D_P12',id:'UNIT_A',title:'Ingresso individual',startsOn:DAY,endsOn:'2026-11-20',quantity:2},'PILOTO');
  assert.equal(act.deliveryUnit,'unit');
  await assert.rejects(s.registerWinner({month:'2026-11',distributionId:'D_P12',actionId:'UNIT_A',id:'UNIT_W',name:'Titular Fictício',phone:'48999999999',companion:{name:'Acompanhante Fictício'}},'ESTÚDIO'),/APENAS EM PRÊMIOS ENTREGUES COMO PAR/);
  assert.equal(Object.keys(db.data['jp-painel-brindes'].winnerBank.records).length,0);
 });
 await test('ACOMPANHANTE: editar cadastro existente mantém ID, reserva e status',async()=>{
  const db=mockDB(),s=new Store(db,{pilotMode:true});global.firebase={database:Object.assign(function(){},{ServerValue:{TIMESTAMP:1794410000000}})};
  await s.createAction({month:'2026-11',distributionId:'D_P12',id:'EDIT_A',title:'Teste edição',startsOn:DAY,endsOn:'2026-11-20',quantity:2},'PILOTO');
  await s.registerWinner({month:'2026-11',distributionId:'D_P12',actionId:'EDIT_A',id:'EDIT_W',name:'Titular Fictício',phone:'48999999999'},'ESTÚDIO');
  const before=db.data['jp-painel-brindes'].state.months['2026-11'].distributions[0];
  const units=C.consumedUnits(before.externalActions.EDIT_A);
  const record=await s.updateCompanion({month:'2026-11',distributionId:'D_P12',actionId:'EDIT_A',winnerId:'EDIT_W',companion:{name:'Outro Fictício',phone:'48988888888'}},'LOCUTOR PILOTO');
  assert.equal(record.companion.name,'OUTRO FICTÍCIO');
  assert.equal(record.companionRevision,1);
  assert.equal(Object.keys(record.companionAudit).length,1);
  assert.equal(C.consumedUnits(before.externalActions.EDIT_A),units);
  assert.equal(Object.keys(before.externalActions.EDIT_A.winners).length,1);
 });
 await test('ACOMPANHANTE: alterar novamente conserva histórico e não repete reserva',async()=>{
  const db=mockDB(),s=new Store(db,{pilotMode:true});global.firebase={database:Object.assign(function(){},{ServerValue:{TIMESTAMP:1794410000000}})};
  await s.createAction({month:'2026-11',distributionId:'D_P12',id:'EDIT_A',title:'Teste edição',startsOn:DAY,endsOn:'2026-11-20',quantity:2},'PILOTO');
  await s.registerWinner({month:'2026-11',distributionId:'D_P12',actionId:'EDIT_A',id:'EDIT_W',name:'Titular Fictício',phone:'48999999999'},'ESTÚDIO');
  const input={month:'2026-11',distributionId:'D_P12',actionId:'EDIT_A',winnerId:'EDIT_W'};
  await s.updateCompanion({...input,companion:{name:'Pessoa Primeira'}},'PILOTO');
  const updated=await s.updateCompanion({...input,companion:{name:'Pessoa Segunda'}},'PILOTO');
  assert.equal(updated.companion.name,'PESSOA SEGUNDA');
  assert.equal(updated.companionRevision,2);
  assert.equal(Object.keys(updated.companionAudit).length,2);
  const removed=await s.updateCompanion({...input,companion:{}},'PILOTO');
  assert.equal(removed.companion,null);
  assert.equal(removed.companionRevision,3);
  const d=db.data['jp-painel-brindes'].state.months['2026-11'].distributions[0];
  assert.equal(C.consumedUnits(d.externalActions.EDIT_A),2);
 });
 await test('ACOMPANHANTE: não aceita titular e acompanhante com mesmo nome na edição',async()=>{
  const db=mockDB(),s=new Store(db,{pilotMode:true});global.firebase={database:Object.assign(function(){},{ServerValue:{TIMESTAMP:1794410000000}})};
  await s.createAction({month:'2026-11',distributionId:'D_P12',id:'EDIT_A',title:'Teste nomes',startsOn:DAY,endsOn:'2026-11-20',quantity:2},'PILOTO');
  await s.registerWinner({month:'2026-11',distributionId:'D_P12',actionId:'EDIT_A',id:'EDIT_W',name:'Titular Fictício',phone:'48999999999'},'ESTÚDIO');
  await assert.rejects(s.updateCompanion({month:'2026-11',distributionId:'D_P12',actionId:'EDIT_A',winnerId:'EDIT_W',companion:{name:'Titular Fictício'}},'PILOTO'),/NÃO CONFIRMADA/);
 });
 await test('ACOMPANHANTE: campos exibidos somente nos pares e painel possui editar/cancelar',()=>{
  const html=require('node:fs').readFileSync(require('node:path').resolve(__dirname,'../promo_externa.html'),'utf8');
  const js=require('node:fs').readFileSync(require('node:path').resolve(__dirname,'../assets/jp-promo-externa-pages.js'),'utf8');
  assert(html.includes('jpExtCompanionName')&&html.includes('jpExtSaveCompanion')&&html.includes('jpExtCancelCompanion'));
  assert(js.includes("companionFields.hidden=selectedAction?.deliveryUnit!=='pair'"));
  assert(js.includes('data-edit-companion')&&js.includes('store.updateWinnerProfile('));
 });
 console.log('SUMMARY',cases,'/',24,'PASS');
})().catch(e=>{console.error('FAIL',e.stack||e);process.exit(1)});
