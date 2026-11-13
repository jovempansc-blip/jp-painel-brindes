'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const C=require('../assets/jp-promo-externa-core.js');
global.JPExternalCore=C;
const Store=require('../assets/jp-promo-externa-firebase.js');
let passed=0;
function test(name,fn){return Promise.resolve().then(fn).then(()=>{passed++;console.log('PASS',passed,name);});}
function copy(v){return v===undefined?undefined:JSON.parse(JSON.stringify(v));}
function mock(){
 const data={months:{'2026-11':{distributions:[{
  id:'DIST_X',prize:'SHOW TESTE',title:'PAR DE INGRESSOS',startDate:'2026-11-01',endDate:'2026-11-30',
  total:30,rua:10,ticketUnits:{rua:'pair'},ar:0}],promos:[],items:[]}}};
 const ops=[],ref=(path='')=>({
  child(v){return ref(path+'/'+v);},
  async get(){
   const parts=path.split('/').filter(Boolean),val=parts.reduce((o,k)=>o?.[k],data);
   return{val:()=>copy(val??null)};
  },
  async transaction(fn){
   ops.push(['tx',path]);
   const parts=path.split('/').filter(Boolean),key=parts.pop();let o=data;
   for(const part of parts){o[part]??={};o=o[part];}
   const next=fn(copy(o[key]??null));
   if(next===undefined)return{committed:false,snapshot:{val:()=>copy(o[key])}};
   o[key]=copy(next);
   return{committed:true,snapshot:{val:()=>copy(next)}};
  }
 });
 return {db:{ref:(p)=>ref(p.replace(/^jp-painel-brindes\/state\/?/,'').replace(/^jp-painel-brindes\/winnerBank\/?/,'winnerBank/'))},data,ops};
}
(async()=>{
 await test('sem Auth SDK, ação externa sem dados pessoais é gravada e verificada',async()=>{
  const {db,data,ops}=mock();
  const store=new Store(db,{auth:null,secureBankVerified:false,allowNonPersonalActions:true});
  const action=await store.createAction({month:'2026-11',distributionId:'DIST_X',title:'Evento Teste',startsOn:'2026-11-13',endsOn:'2026-11-25',quantity:2},'RECEPÇÃO');
  assert.equal(action.allocatedUnits,4);
  assert.equal(action.createdBy,'PAINEL PRINCIPAL · EXTERNA');
  assert.equal(C.remainingUnallocated(data.months['2026-11'].distributions[0]),16);
  assert(ops.some(v=>v[0]==='tx'&&v[1]==='months/2026-11/distributions'));
 });
 await test('sem opção especial, ação continua protegida como antes',async()=>{
  const {db,ops}=mock(),store=new Store(db,{auth:null,secureBankVerified:false});
  await assert.rejects(()=>store.createAction({month:'2026-11',distributionId:'DIST_X',title:'Evento Teste',startsOn:'2026-11-13',endsOn:'2026-11-25',quantity:2},'OPERADOR'),/AUTENTICAÇÃO/);
  assert.equal(ops.length,0);
 });
 await test('sem autorização privada, cadastro de ganhador continua bloqueado',async()=>{
  const {db,ops}=mock(),store=new Store(db,{auth:null,secureBankVerified:false,allowNonPersonalActions:true});
  await assert.rejects(()=>store.registerWinner({month:'2026-11',distributionId:'DIST_X',actionId:'X',name:'Pessoa Teste',phone:'48999999999'},'TESTE'),/AUTENTICAÇÃO/);
  assert.equal(ops.length,0);
 });
 await test('Auth sem banco seguro não libera cadastro de ganhador',async()=>{
  const {db,ops}=mock(),store=new Store(db,{auth:{currentUser:{uid:'TESTE'}},secureBankVerified:false,allowNonPersonalActions:true});
  await assert.rejects(()=>store.registerWinner({month:'2026-11',distributionId:'DIST_X',actionId:'X',name:'Pessoa Teste',phone:'48999999999'},'TESTE'),/BANCO DE GANHADORES/);
  assert.equal(ops.length,0);
 });
 await test('cadastro de ação continua impedindo gasto superior à cota',async()=>{
  const {db,data}=mock(),store=new Store(db,{auth:null,secureBankVerified:false,allowNonPersonalActions:true});
  await store.createAction({month:'2026-11',distributionId:'DIST_X',title:'Primeira',startsOn:'2026-11-13',endsOn:'2026-11-25',quantity:8},'TESTE');
  await assert.rejects(()=>store.createAction({month:'2026-11',distributionId:'DIST_X',title:'Segunda',startsOn:'2026-11-13',endsOn:'2026-11-25',quantity:3},'TESTE'),/INSUFICIENTE/);
  assert.equal(Object.keys(data.months['2026-11'].distributions[0].externalActions).length,1);
 });
 await test('UI da Externa não chama Auth obrigatório sem SDK carregado',()=>{
  const ui=fs.readFileSync(path.join(root,'assets/jp-promo-externa-main.js'),'utf8');
  assert(ui.includes("typeof window.firebase?.auth==='function'"));
  assert(ui.includes('allowNonPersonalActions:true'));
  assert(!ui.includes('auth:window.firebase.auth(),'));
 });
 await test('nenhuma flag de segurança privada foi ligada pelo hotfix',()=>{
  const env=fs.readFileSync(path.join(root,'assets/jp-promo-externa-env.js'),'utf8');
  assert(env.includes('JP_EXT_SECURE_BANK_VERIFIED = false'));
  assert(!fs.readFileSync(path.join(root,'index.html'),'utf8').includes('JP_PASSPORT_PRIVATE_RULES_HOMOLOGATED=true'));
 });
 await test('cache bust identifica os dois módulos alterados',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert(html.includes('jp-promo-externa-main.js?v=AV58_HOTFIX_EXT_ACTIONS_20261113'));
  assert(html.includes('jp-promo-externa-firebase.js?v=AV58_HOTFIX_EXT_ACTIONS_20261113'));
 });
 await test('após salvar, recarrega a distribuição antes de renderizar a tabela',()=>{
  const ui=fs.readFileSync(path.join(root,'assets/jp-promo-externa-main.js'),'utf8');
  assert(ui.includes('const latest=await store.month(payload.month)'));
  assert(ui.includes('state.months[payload.month].distributions=latest.distributions'));
  assert(ui.includes('f.reset();render();'));
 });
 console.log('EXTERNA_ACTIONS_FIX',passed,'PASS 0 FAIL');
})().catch(e=>{console.error(e);process.exitCode=1});

