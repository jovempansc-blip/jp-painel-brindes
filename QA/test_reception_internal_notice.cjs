const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'assets/jp-promo-externa-reception-bridge.js'),'utf8');
const html=fs.readFileSync(path.join(root,'preview_recepcao.html'),'utf8');
let passed=0;
function test(name,fn){fn();console.log('PASS',++passed,name)}
test('mensagem interna da integração não é apresentada na Recepção',()=>{
 const host={textContent:'AGUARDANDO CONEXÃO...',addEventListener:()=>{},innerHTML:''};
 const count={textContent:'0 A RETIRAR'};
 const section={hidden:false};
 const lookup={jpExternalReceptionRows:host,jpExternalReceptionCount:count,jpExternalReceptionSection:section};
 const document={getElementById:k=>lookup[k]||null};
 const scope={window:{JPExternalCore:{},JPExternalRTDB:{},JP_EXT_SECURE_BANK_VERIFIED:false},
  document,console};
 scope.window.window=scope.window;
 vm.runInNewContext(code,scope);
 assert.equal(host.textContent,'');
 assert.equal(section.hidden,true);
 assert.equal(count.textContent,'0 A RETIRAR');
});
test('a integração de segurança permanece bloqueada até verificação explícita',()=>{
 assert(code.includes('const secure=global.JP_EXT_SECURE_BANK_VERIFIED===true'));
 assert(code.includes('if(!secure){'));
 assert(code.includes("message('');"));
});
test('nenhum conteúdo implica nenhum espaço visual reservado',()=>{
 assert(html.includes('id="jpExternalReceptionSection" aria-label="Ganhadores de Promo Externa" hidden'));
 assert(html.includes('#jpExternalReceptionSection[hidden]{display:none!important}'));
 assert(code.includes('setVisible(selected.length>0)'));
 assert(code.includes("if(!selected.length){host.textContent='';return;}"));
});
console.log('RECEPTION_INTERNAL_NOTICE',passed,'PASS 0 FAIL');

