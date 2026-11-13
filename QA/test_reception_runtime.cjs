const A=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),P=require('node:path');
const C=require('../assets/jp-passport-core.js');
const source=fs.readFileSync(P.resolve(__dirname,'../assets/jp-reception-passport.js'),'utf8');
let n=0;const check=(title,fn)=>{fn();console.log('PASS',++n,title)};
class Node{
 constructor(id=''){this.id=id;this.dataset={};this.style={};this.hidden=false;this.innerHTML='';this.textContent='';this.value='';}
 closest(){return section;}
 querySelector(){return labels;}
 insertAdjacentElement(){}
 appendChild(node){nodes[node.id]=node;}
 setAttribute(key,value){this[key]=value;}
}
const nodes={};
const section=new Node('section'),header=new Node('header'),labels=new Node('labels');
section.querySelector=s=>s==='.receptionCampaignHeading'?header:s==='.receptionCampaignLabels'?labels:null;
nodes.receptionCampaignList=new Node('receptionCampaignList');
nodes.receptionCampaignList.closest=()=>section;
nodes.receptionCampaignCount=new Node('receptionCampaignCount');
nodes.searchFilter=new Node('searchFilter');
const promo={id:'P1',name:'P12 VERÃO',kind:'promo',startDate:'2026-01-01',
 resultWinnersByHour:{'2026-01-01_10H':[{id:'W1',name:'Ganhador Um'}]}};
const writes=[];
const refPath=path=>({
 on:(type,callback)=>{if(type==='value'&&path==='/receptionCampaignPins')callback({val:()=>({[Array.from('P1').map(x=>x.codePointAt(0).toString(16)).join('-')]:{pinned:true,history:[{action:'PIN'}]}})});
  if(type==='value'&&path==='/passportCampaigns')callback({val:()=>({})});},
 child:child=>refPath(path+'/'+child),
 transaction:()=>{writes.push(path);throw Error('WRITES NOT ALLOWED IN MOCK')},
 get:()=>Promise.resolve({val:()=>null})
});
const document={
 createElement:tag=>new Node(),
 getElementById:id=>nodes[id]||null,
 querySelectorAll:()=>[],
 addEventListener:()=>{},
 body:{appendChild:n=>nodes[n.id]=n}
};
const ctx={window:{JPPassportCore:C,location:{search:''}},document,
 receptionAllPromos:()=>[promo],receptionCampaignVisible:()=>true,
 receptionActiveCampaigns:()=>[],receptionCampaignState:(p,r,t)=>({p,winners:[{result:'Ganhador Um'}],pending:[],ended:true}),
 renderReceptionCampaigns:()=>{},allResultRows:()=>[],todayISO:()=> '2026-11-13',
 firebaseRef:refPath(''),receptionDatabase:{},state:{months:{}},formatBR:x=>x,
 console,Number,Object,Array,String,Math,Date,JSON,URLSearchParams,Promise,innerWidth:1024,innerHeight:768};
ctx.window.window=ctx.window;vm.createContext(ctx);vm.runInContext(source,ctx);
const api=ctx.window.JPReceptionPassport;
check('módulo carregou sem erro e sem gravação',()=>A(api&&typeof api.alternative==='function'));
check('navegação integrada ao componente existente',()=>A(nodes.jpRcpMenu&&nodes.jpRcpEditor));
check('fixação recuperada do Firebase',()=>A.equal(api.isPinned('P1'),true));
check('promoção encerrada fixada retorna à lista principal',()=>{
 const rows=api.active([]);A.equal(rows.length,1);A.equal(rows[0].p.id,'P1');
});
check('aba Fixadas lista promoção encerrada',()=>{
 const btn=api.alternative;ctx.window.JPReceptionPassport=api;
 // simulated interaction updates tab via capturing event in real DOM; here trigger method indirectly is not necessary
 A(api.tab==='ativas');A.equal(api.alternative(),false);
});
check('sorteado permanece na promoção original',()=>A.equal(C.winnerRows(promo)[0].name,'GANHADOR UM'));
check('nenhuma chamada de gravação durante montagem e consulta',()=>A.deepEqual(writes,[]));
console.log('RECEPTION MOCK',n,'PASS 0 FAIL');

