'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const js=fs.readFileSync(path.join(__dirname,'../assets/jp-promo-externa-reception-bridge.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../preview_recepcao.html'),'utf8');
let n=0;const test=(name,fn)=>{fn();console.log('PASS',++n,name)};
const host={innerHTML:'',textContent:'',handlers:{},addEventListener(type,cb){this.handlers[type]=cb}};
const count={textContent:''};const section={hidden:true};
const doc={getElementById(id){return ({jpExternalReceptionRows:host,jpExternalReceptionCount:count,jpExternalReceptionSection:section})[id]||null}};
let authCalled=false,monthsSubscribed=false,bankSubscribed=false,pickups=0;
const person={id:'W_SYNTHETIC',actionId:'A_TEST',distributionId:'D_TEST',status:'AGUARDANDO_RETIRADA',
 bankStatus:'CONFIRMADO',quantity:1,deliveryUnit:'pair',registeredAtMs:1794410000000};
const actions=[{id:'A_TEST',title:'AÇÃO FICTÍCIA',prize:'INGRESSO EVENTO FICTÍCIO',distributionMonth:'2026-11',deliveryUnit:'pair',winners:[person]}];
const firebaseDB={ref(path){return{
 on(event,fn){bankSubscribed=true;fn({val:()=>({'EXTERNA_W_SYNTHETIC':{name:'PESSOA FICTÍCIA',phone:'48999999999',companion:{name:'ACOMPANHANTE FICTÍCIO',phone:'48988888888',cpf:'52998224725'}}})});},
 off(){},
 };}};
class DB{constructor(db,options){assert(options.pilotMode===true);assert(options.auth===null);}
 onMonths(fn){monthsSubscribed=true;fn({});return ()=>{};}
 async pickup(){pickups++;return{status:'RETIRADO',deliveredAtMs:1794410000000,bankPickupPending:false};}
 async retryBankSync(){return true;}
}
const windowObj={
 JP_BOARD_PILOT_SYNTHETIC:true,JP_EXT_SECURE_BANK_VERIFIED:false,
 JPExternalCore:{flatten:()=>actions},JPExternalRTDB:DB,
 firebase:{apps:[{}],app(){return{}},database(){return firebaseDB},auth(){authCalled=true;throw Error('auth forbidden in synthetic pilot')}},
 alert(){},prompt(){return'RECEPÇÃO PILOTO'},confirm(){return true}
};
vm.runInNewContext(js,{window:windowObj,document:doc,console,Date,Number,String,Array,Object,Promise});
test('não invoca login Google em modo piloto',()=>assert.equal(authCalled,false));
test('o módulo aceita leitura pública de dados sintéticos',()=>assert(monthsSubscribed&&bankSubscribed));
test('módulo aparece na Recepção principal',()=>assert.equal(section.hidden,false));
test('a promoção fictícia aparece no painel',()=>assert(host.innerHTML.includes('AÇÃO FICTÍCIA')));
test('o ganhador fictício aparece no painel',()=>assert(host.innerHTML.includes('PESSOA FICTÍCIA')));
test('o acompanhante aparece na Recepção principal com o mesmo titular',()=>assert(host.innerHTML.includes('ACOMPANHANTE FICTÍCIO')));
test('CPF do acompanhante não é exposto em texto puro na Recepção',()=>assert(!host.innerHTML.includes('52998224725')&&host.innerHTML.includes('CPF: CADASTRADO')));
test('o botão de retirada é exibido ao conciliar registro',()=>assert(host.innerHTML.includes('CONFIRMAR RETIRADA')));
test('a versão nova está importada na Recepção',()=>assert(html.includes('jp-promo-externa-reception-bridge.js?v=JP_EXTERNA_LISTA_COMPACTA_20261116')));
(async()=>{
 await host.handlers.click({target:{closest(selector){return selector==='[data-ext-pickup],[data-ext-sync]'?{dataset:{extPickup:'W_SYNTHETIC'},disabled:false,textContent:''}:null;}}});
 test('retirada chama um único fluxo canônico',()=>assert.equal(pickups,1));
 console.log('COMPANION_RECEPTION_BRIDGE',n,'PASS 0 FAIL');
})().catch(e=>{console.error(e);process.exitCode=1});
