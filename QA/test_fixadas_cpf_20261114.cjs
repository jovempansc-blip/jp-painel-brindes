'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const Core=require('../assets/jp-promo-externa-core.js');
let count=0;async function test(name,fn){await fn();console.log('PASS',++count,name);}
const saved={};const children={};const handlers={};const listeners={};
function makeNode(id=''){return{
 id,innerHTML:'',textContent:'',hidden:false,value:'',dataset:{},style:{},
 closest(selector){return selector==='.receptionCampaignSection'?section:null},
 querySelector(selector){return selector==='.receptionCampaignHeading'?header:selector==='.receptionCampaignLabels'?labels:null},
 appendChild(child){children[child.id]=child},insertAdjacentElement(where,child){children[child.id]=child},
 setAttribute(attr,value){this[attr]=value},getBoundingClientRect(){return{left:15,bottom:50}}
};}
const section=makeNode('section'),header=makeNode('heading'),labels=makeNode('labels');
const list=makeNode('receptionCampaignList');
list.closest=()=>section;
Object.assign(children,{receptionCampaignList:list,receptionCampaignCount:makeNode('receptionCampaignCount'),searchFilter:makeNode('searchFilter')});
const promo={id:'PROMO_TEST_PIN',kind:'promo',name:'PROMO DE TESTE',startDate:'2026-11-01',resultWinnersByHour:{}};
const encode=id=>Array.from(String(id)).map(ch=>ch.codePointAt(0).toString(16)).join('-');
let transactions=0,privateWrites=0;
function ref(at=''){
 const loc=at.split('/').filter(Boolean);
 const isPin=at.startsWith('/receptionCampaignPins/');
 const listenerKey=loc[0];
 return {
 child(name){return ref(at+'/'+name)},
 on(event,callback){if(event==='value'){listeners[at]=callback;callback({val:()=>null});} },
 async transaction(fn){
  transactions++;
  if(at.includes('passportPrivate')||at.includes('winnerBank'))privateWrites++;
  assert(isPin,'unexpected write '+at);
  const old=saved[at]||null;const next=fn(old);if(next===undefined)return{committed:false};
  saved[at]=next;
  if(isPin&&listeners['/receptionCampaignPins']){
   const key=loc[1];listeners['/receptionCampaignPins']({val:()=>({[key]:next})});
  }
  return{committed:true};
 },
 async get(){return{val:()=>saved[at]??null}}
 };
}
const document={
 getElementById:id=>children[id]||null,
 createElement:()=>makeNode(),
 querySelectorAll:()=>[],
 addEventListener:(name,fn)=>{handlers[name]=fn},
 body:{appendChild:x=>children[x.id]=x}
};
const fake={
 window:{JPPassportCore:require('../assets/jp-passport-core.js'),location:{search:''}},
 document,console,Date,Math,Object,Array,String,Number,JSON,URLSearchParams,Promise,
 firebaseRef:ref(),receptionDatabase:{},innerWidth:1024,innerHeight:768,
 receptionAllPromos:()=>[promo],receptionCampaignVisible:()=>true,
 receptionActiveCampaigns:()=>[],receptionCampaignState:p=>({p,pending:[],winners:[]}),
 renderReceptionCampaigns:()=>{},allResultRows:()=>[],
 todayISO:()=> '2026-11-14',formatBR:s=>s,state:{months:{}},
 ensureReceptionOnline:async()=>true,receptionOperatorIdentity:()=>({name:'RECEPÇÃO',sector:'RECEPÇÃO'}),
 showReceptionToast:()=>{},
};
vm.createContext(fake);
vm.runInContext(read('assets/jp-reception-passport.js'),fake,{filename:'jp-reception-passport.js'});
const api=fake.window.JPReceptionPassport;
const evt=(selector,attrs)=>({
 preventDefault(){},stopImmediatePropagation(){},
 target:{closest(s){return s===selector?{dataset:attrs,getBoundingClientRect:()=>({left:10,bottom:30})}:null}}
});
(async()=>{
 await test('opções Fixadas e Histórico são integradas à Recepção',()=>assert(api?.alternative&&children.jpRcpTabs&&children.jpRcpMenu));
 await test('sem autenticação especial, menu abre e fixa metadados',async()=>{
  handlers.click(evt('[data-jp-menu]',{jpMenu:promo.id}));
  handlers.click(evt('[data-jp-action]',{jpAction:'pin'}));
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(transactions,1);
  const val=saved['/receptionCampaignPins/'+encode(promo.id)];
  assert.equal(val.pinned,true);assert.equal(val.promoId,promo.id);
  assert.equal(val.history[0].action,'PIN');
 });
 await test('aba Fixadas abre e mostra promoção que foi fixada',()=>{
  children.receptionCampaignLabels=labels;
  handlers.click(evt('[data-jp-tab]',{jpTab:'fixadas'}));
  assert.equal(api.tab,'fixadas');assert.equal(api.alternative(),true);
  assert(children.receptionCampaignList.innerHTML.includes('PROMO DE TESTE'));
  assert.equal(labels.hidden,true);
 });
 await test('aba Histórico abre por ano sem navegar para outra página',()=>{
  children.jpRcpYear=makeNode('jpRcpYear');children.jpRcpYear.value='2026';
  handlers.click(evt('[data-jp-tab]',{jpTab:'historico'}));
  assert.equal(api.tab,'historico');assert.equal(api.alternative(),true);
  assert(children.receptionCampaignList.innerHTML.includes('PROMO DE TESTE'));
 });
 await test('fixação mantém registros privados intocados',()=>assert.equal(privateWrites,0));
 await test('CPF vazio é válido porque é opcional',()=>assert.equal(Core.cpfValid(''),true));
 await test('CPF sintético válido é aceito',()=>assert.equal(Core.cpfValid('529.982.247-25'),true));
 await test('CPF inválido é recusado',()=>assert.equal(Core.cpfValid('52998224726'),false));
 await test('CPF de números repetidos é recusado',()=>assert.equal(Core.cpfValid('11111111111'),false));
 await test('CPF sem máscara é normalizado',()=>assert.equal(Core.cpfDigits('529.982.247-25'),'52998224725'));
 await test('CPF editável na Promo Externa',()=>{
  const s=read('promo_externa.html');assert(s.includes('id="jpExtCpf" name="cpf"'));assert(!s.includes('id="jpExtCpf" disabled'));
 });
 await test('configuração oficial sem desbloquear PII',()=>{
  const s=read('assets/jp-promo-externa-env.js');
  assert(s.includes('"projectId": "jp-painel-brindes"'));assert(s.includes('JP_EXT_SECURE_BANK_VERIFIED = false'));
 });
 await test('registro de CPF não será escrito na Distribuição',()=>{
  const s=read('assets/jp-promo-externa-firebase.js');assert(s.includes('cpf:undefined,id:winnerId'));
  assert(s.includes('if(cpf)record.cpf=cpf'));
 });
 await test('gravação nominal exige autenticação e banco homologado',()=>{
  const s=read('assets/jp-promo-externa-firebase.js');assert(s.includes('this.checkAuth()'));assert(s.includes('this.secureBankVerified'));
 });
 await test('botão de fixação permanece ancorado na linha da promoção',()=>{
  const css=read('assets/jp-reception-passport.css');
  assert(css.includes('.receptionCampaign summary{position:relative}'));
  assert(css.includes('.jpRcpMenuButton'));
 });
 await test('fixação original substitui apenas UX de Recepção',()=>{
  const s=read('preview_recepcao.html');assert(s.includes('JPReceptionPassport?.alternative?.()'));assert(s.includes('jp-reception-passport.js'));
 });
 console.log('RECEPCAO_FIXADAS_CPF',count,'PASS 0 FAIL');
})().catch(e=>{console.error(e);process.exitCode=1});

