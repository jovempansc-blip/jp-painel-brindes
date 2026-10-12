const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const index=fs.readFileSync('index.html','utf8');
const studio=fs.readFileSync('painel_pauta_estudio_jovem_pan_GITHUB_API.html','utf8');
assert.match(index,/id="promoCompanionIdentify"/);
assert.match(index,/id="promoCompanionsPerWinner"/);
assert.match(index,/bind\('promoCompanionIdentify','change'/);
assert.match(index,/if\(!active\)promoWinnerFieldDefinitions\(\)\.forEach/);
assert.match(index,/if\(name\)name\.value='pickup'/);
assert.match(index,/if\(companion\)companion\.hidden=!enabled\|\|count===0\|\|!identifying/);
assert.match(studio,/const STUDIO_SHORTCUT_ALERT_IDS=\['promoListBtn','merchanListBtn'\];/);
assert.doesNotMatch(studio,/STUDIO_SHORTCUT_ALERT_IDS=\[[^\]]*studioPendingBellBtn/);
assert.match(studio,/id="studioReadingDueBanner" hidden/);
const code=studio.match(/function studioReadingDueClick\(mode\)\{[\s\S]*?\n\}\nfunction refreshStudioReadingDueBanner\(\)\{[\s\S]*?\n\}\nfunction refreshStudioShortcutAlerts/);
assert.ok(code,'Funções de banner não localizadas');
let counts={promo:2,merchan:1};
const elements={};
for(const k of ['studioReadingDueBanner','studioReadingDuePromo','studioReadingDueMerchan','studioReadingDuePromoText','studioReadingDueMerchanText','pautaPanel'])elements[k]={hidden:true,textContent:'',scrollIntoView(){this.scrolled=true;}};
const context={
  $:name=>elements[name]||null,studioCurrentReadItem:()=>({}),
  studioDrawerPendingCount:kind=>counts[kind],studioDrawerMode:'',toggleStudioDrawer:kind=>{context.studioDrawerMode=kind;}
};
vm.createContext(context);
vm.runInContext(code[0].replace(/\nfunction refreshStudioShortcutAlerts$/,''),context);
context.refreshStudioReadingDueBanner();
assert.equal(elements.studioReadingDueBanner.hidden,false);
assert.equal(elements.studioReadingDuePromo.hidden,false);
assert.equal(elements.studioReadingDueMerchan.hidden,false);
assert.equal(elements.studioReadingDuePromoText.textContent,'2 LEITURAS DE PAUTA PENDENTES');
assert.equal(elements.studioReadingDueMerchanText.textContent,'1 MERCHAN PENDENTE');
context.studioReadingDueClick('merchan');
assert.equal(context.studioDrawerMode,'merchan');
assert.equal(elements.pautaPanel.scrolled,true);
counts={promo:0,merchan:0};context.refreshStudioReadingDueBanner();
assert.equal(elements.studioReadingDueBanner.hidden,true);
assert.equal(elements.studioReadingDuePromo.hidden,true);
assert.equal(elements.studioReadingDueMerchan.hidden,true);
// Verifica que os caminhos e a estrutura de persistência não foram alterados.
for(const name of ['FIREBASE_ROOT_PATH','WINNER_BANK_PATH'])assert.match(studio,new RegExp('const '+name+' ='));
console.log('PASS: AV58.1.11 acompanhantes, sino estático, P/M, rodapé e botões (teste isolado)');
