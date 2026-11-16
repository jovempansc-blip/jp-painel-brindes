'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'assets/jp-promo-externa-pages.js'),'utf8');
const html=fs.readFileSync(path.join(root,'promo_externa.html'),'utf8');
const C=require('../assets/jp-promo-externa-core.js');
const operatorDecl=code.slice(code.indexOf(' function operatorName(){'),code.indexOf(' function active(){'));
const begin=code.indexOf(' async function handleRegistration('),end=code.indexOf(' async function handleReception(',begin);
assert(begin>0&&end>begin&&operatorDecl.includes('operatorName'));
const registration=code.slice(begin,end);
let total=0;const check=(name,fn)=>{fn();console.log('PASS',++total,name)};
function setup(options={}){
 const fields={
  jpExtWinnerName:{value:options.name||'PESSOA FICTICIA TESTE'},
  jpExtPhone:{value:options.phone||'48999999999'},
  jpExtCpf:{value:options.cpf||''}
 };
 if(options.operator!==undefined)fields.jpExtOperator={value:options.operator};
 const writes=[],messages=[],state={calls:0},button={preventDefault(){state.prevented=true}};
 const make=new Function('element','window','C','store','active','selected','renderStudio','show','asBR',
  'let busy=false;\n'+operatorDecl+'\n'+registration+'\nreturn handleRegistration;');
 const store={async registerWinner(payload,operator){writes.push({payload,operator});if(options.fail)throw Error(options.fail);return {bankSynced:true,registeredAtMs:1794819600000};}};
 const handle=make(id=>fields[id]||null,{JP_EXT_PILOT_MODE:true},C,store,
  ()=>[{id:'A_TEST',distributionMonth:'2026-11',distributionId:'D_TEST'}],
  'A_TEST',()=>{state.calls++;},(text,error)=>messages.push({text,error}),()=> '16/11/2026 10:26');
 return {handle,button,fields,writes,messages,state};
}
(async()=>{
 check('HTML não exige campo oculto de identificação do locutor',()=>assert(!html.includes('id="jpExtOperator"')));
 check('erro impeditivo não existe mais no controlador',()=>assert(!code.includes('INFORME A IDENTIFICAÇÃO DO LOCUTOR.')));
 check('JS registra origem padrão do link externo',()=>assert(code.includes("operatorName()||'PROMO EXTERNA · ESTÚDIO'")));
 check('formulário de ganhador e botão salvar preservados',()=>assert(html.includes('id="jpExtWinnerForm"')&&html.includes('id="jpExtSubmit"')));
 check('cache bust obriga novo controlador no site',()=>assert(html.includes('JP_CORRECAO_LOCUTOR_20261116')));
 const a=setup();await a.handle(a.button);
 check('sem locutor cadastrado, salvamento é chamado uma vez',()=>assert.equal(a.writes.length,1));
 check('sem locutor, registra origem Promo Externa',()=>assert.equal(a.writes[0].operator,'PROMO EXTERNA · ESTÚDIO'));
 check('mantém nome e telefone completos do ganhador',()=>{assert.equal(a.writes[0].payload.name,'PESSOA FICTICIA TESTE');assert.equal(a.writes[0].payload.phone,'48999999999');});
 check('CPF vazio não impede salvamento',()=>assert.equal(a.writes[0].payload.cpf,''));
 check('estado indica confirmação de gravação pelo Banco de Ganhadores',()=>assert(a.messages.some(x=>x.text.includes('ENVIADO À RECEPÇÃO'))));
 check('limpa campos após confirmação',()=>assert.equal(a.fields.jpExtWinnerName.value,''));
 const b=setup({operator:'OPERADOR DE TESTE'});await b.handle(b.button);
 check('identificação existente continua registrada quando fornecida',()=>assert.equal(b.writes[0].operator,'OPERADOR DE TESTE'));
 const c=setup({cpf:'12345678900'});await c.handle(c.button);
 check('CPF inválido continua bloqueado',()=>assert.equal(c.writes.length,0));
 check('erro de CPF é comunicado sem salvar',()=>assert(c.messages.some(x=>x.text.includes('CPF INVÁLIDO'))));
 const d=setup({fail:'SALDO INSUFICIENTE'});await d.handle(d.button);
 check('erro de saldo ou Firebase continua visível',()=>assert(d.messages.some(x=>x.text.includes('SALDO INSUFICIENTE'))));
 check('controlador da Recepção Externa mantém validação de responsável',()=>assert(code.includes('INFORME O RESPONSÁVEL PELA RECEPÇÃO.')));
 console.log('PROMO_EXTERNA_LOCUTOR_FIX',total,'PASS 0 FAIL');
})().catch(e=>{console.error(e);process.exitCode=1});
