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
// AV58.1.18: o aviso vermelho inferior foi retirado; P/M e trilhos seguem ativos.
assert.doesNotMatch(studio,/id="studioReadingDueBanner"/);
assert.doesNotMatch(studio,/function refreshStudioReadingDueBanner\(/);
assert.match(studio,/id="promoListBtn"/);
assert.match(studio,/id="merchanListBtn"/);
assert.match(studio,/id="studioSidePromoRail"/);
assert.match(studio,/id="studioSideMerchanRail"/);
// Verifica que os caminhos e a estrutura de persistência não foram alterados.
for(const name of ['FIREBASE_ROOT_PATH','WINNER_BANK_PATH'])assert.match(studio,new RegExp('const '+name+' ='));
console.log('PASS: acompanhantes, sino estático, P/M, trilhos e ausência da faixa inferior');
