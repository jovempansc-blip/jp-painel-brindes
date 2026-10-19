'use strict';
const fs=require('fs'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const manual=fs.readFileSync(path.join(root,'assets/prog-manual.js'),'utf8');
assert(html.includes('id="prizeCatalogHelpDialog"'),'Modal informativo deve existir');
assert(html.indexOf('id="prizeCatalogHelpDialog"')<html.indexOf("bind('prizeCatalogHelpClose'"),'Elementos devem existir antes dos eventos de clique');
for(const id of ['prizeCatalogInfoBtn','prizeCatalogHelpUnderstood','prizeCatalogHelpClose']){
  assert(html.includes(`bind('${id}','click'`),`Sem ação de clique: ${id}`);
}
assert(/assets\/prog-manual\.js\?v=AV58_1_(?:2[6-9]|[3-9]\d)/.test(html),'A versão JS precisa vencer o cache anterior');
assert(manual.includes("host.addEventListener('keydown'"),'A lista deve aceitar teclado');
assert(manual.includes("['Enter',' '].includes(e.key)"),'Enter e Espaço devem funcionar');
assert(!manual.includes('class="jpManualDrop" data-target="${clean(s)}" tabindex="0" role="button"'),'Alvo de arraste não pode anunciar ação por clique não implementada');
for(const f of ['index.html','preview.html','preview_recepcao.html','merchan_radios.html','painel_pauta_estudio_jovem_pan_GITHUB_API.html','painel_pauta_estudio_jovem_pan_news.html']){
  assert(fs.existsSync(path.join(root,f)),`HTML ausente: ${f}`);
}
console.log('PASS: AV58.1.26 ações de ajuda, botões via teclado, cache atualizado e seis páginas preservadas');
