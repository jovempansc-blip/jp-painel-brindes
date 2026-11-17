'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'../painel_pauta_estudio_jovem_pan_GITHUB_API.html'),'utf8');
const start=html.indexOf('/* PROMO_WINNER_FIELDS_START */'),end=html.indexOf('/* PROMO_WINNER_STORE_END */')+'/* PROMO_WINNER_STORE_END */'.length;
const moduleCode=html.slice(start,end);
const clone=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
const promo={id:'PROMO_TEST',kind:'promo',name:'PROMOÇÃO TESTE',
 winnerRegistration:{fields:{name:'result',phone:'pickup',cpf:'pickup',instagram:'optional'},companionsPerWinner:3,companionFields:{name:'pickup',phone:'off',cpf:'optional',instagram:'off'}},
 occurrences:[{id:'O1',date:'2026-11-16',time:'20:30',qtyPlanned:1,status:'AGENDADO'}]};
let months={'2026-11':{promos:[clone(promo)]}},records={},locks={},calls={bankRead:0,promoRead:0,bankWrite:0,promoWrite:0};
const update=(obj,patch)=>Object.entries(patch).forEach(([k,v])=>v===null?delete obj[k]:obj[k]=clone(v));
const makeRef=(parts=[])=>({
 child(k){return makeRef([...parts,k])},
 push(){return{key:'MOCK_PUSH'}},
 async get(){
  if(parts[0]==='months'){calls.promoRead++;return{val:()=>clone(months[parts[1]].promos)}}
  if(parts.length===0){calls.bankRead++;return{val:()=>({initialized:true,records:clone(records),blocks:{},settings:{}})}}
  throw Error('unknown get '+parts.join('/'));
 },
 async update(values){
  if(parts.join('/')==='records'){calls.bankWrite++;update(records,values);return;}
  throw Error('unknown update '+parts.join('/'));
 },
 async transaction(cb){
  if(parts.join('/')==='months/2026-11/promos'){
    let current=clone(months['2026-11'].promos),v=cb(current);
    if(v===undefined)return{committed:false,snapshot:{val:()=>current}};
    calls.promoWrite++;months['2026-11'].promos=clone(v);
    return{committed:true,snapshot:{val:()=>clone(v)}};
  }
  if(parts[0]==='locks'){
    const key=parts[1],cur=clone(locks[key]||null),next=cb(cur);
    if(next===undefined)return{committed:false,snapshot:{val:()=>cur}};
    if(next===null)delete locks[key];else locks[key]=clone(next);
    return{committed:true,snapshot:{val:()=>clone(next)}};
  }
  if(parts.join('/')==='records'){
    const next=cb(clone(records));records=clone(next);return{committed:true,snapshot:{val:()=>clone(next)}};
  }
  throw Error('unknown transaction '+parts.join('/'));
 }
});
const globals={console,Date,Math,Number,JSON,String,Object,Array,Set,Map,
  upper:x=>String(x||'').trim().toUpperCase(),
  winnerBankSnapshot:{},winnerPrizeKey:x=>String(x||'').trim().toUpperCase(),
  promoResultHourKeys:()=>['2026-11-162030']};
vm.createContext(globals);vm.runInContext(moduleCode,globals);
(async()=>{
 const context={sourceRef:'PROMO:PROMO_TEST:2026-11-16:20H30',date:'2026-11-16',time:'20:30',slot:'20H30',program:'JP',prize:'PAR DE INGRESSOS'};
 const winner={id:'PW_FICTICIO',name:'PESSOA TESTE FICTICIA',fullName:'PESSOA TESTE FICTICIA',phone:'',cpf:'',instagram:'',companions:[],registrationRules:clone(promo.winnerRegistration),profileVersion:0};
 const ret=await globals.promoWinnerStore({
  stateRef:makeRef([]),bankRef:makeRef([]),promo,occurrenceKey:'2026-11-162030',winners:[winner],
  context,operator:{name:'QA',sector:'QA'},monthKeys:['2026-11'],months,validateRemote:row=>{if(!row.occurrences.length)throw Error('not eligible')}
 });
 assert.equal(ret.winners[0].name,'PESSOA TESTE FICTICIA');
 assert.equal(months['2026-11'].promos[0].resultName,'PESSOA TESTE FICTICIA');
 assert.equal(Object.keys(records).length,1);
 console.log('PASS configured promotion name stored in winner bank and promotion, calls=',calls);
})().catch(e=>{console.log('FAIL',e.stack||e);process.exitCode=1});
