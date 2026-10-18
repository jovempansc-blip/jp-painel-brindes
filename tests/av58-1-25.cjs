/* AV58.1.25 static/form-flow checks; deliberately no production access. */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const base=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const names=['index.html','merchan_radios.html','painel_pauta_estudio_jovem_pan_GITHUB_API.html','painel_pauta_estudio_jovem_pan_news.html','preview.html','preview_recepcao.html'];
for(const name of names){const source=fs.readFileSync(path.join(base,name),'utf8');assert.match(source,/assets\/jp-forms-125\.css\?v=AV58_1_25/);}
const css=fs.readFileSync(path.join(base,'assets/jp-forms-125.css'),'utf8');
assert.match(css,/#promoDrawer \.drawerCard/);assert.match(css,/#merchanForm/);assert.match(css,/#winnerModal \.modalCard/);assert.match(css,/\.jpOptionalPautaRow/);
for(const id of ['promoHasLinkedPauta','promoLinkedPromotionId','jpLinkedPautaContext','jpLinkedStatus']) assert.ok(html.includes(`id="${id}"`),id);
assert.match(html,/await flushFirebaseNow\(`\$\{promoKindLabel\(kind\)\} SALVA`\)/);
assert.ok(html.indexOf('await flushFirebaseNow(`${promoKindLabel(kind)} SALVA`)')<html.lastIndexOf('jpOpenLinkedPautaAfterSave(p);'),'linked pauta must open after ack');
assert.match(html,/linkedPromotionId:!isPromo/);assert.match(html,/hasLinkedPauta:isPromo/);
assert.match(html,/if\(isPromo&&p\.hasLinkedPauta&&!jpLinkedPautasFor\(p\.id\)\.length\)/);
assert.match(html,/promoRotationForm\(existing\)/);assert.match(html,/promoReadMethod:\$\('promoReadMethod'\)/);
const fragment=html.slice(html.indexOf('/* AV58.1.25 · Uma promoção'),html.indexOf('window.openPromoStartModal=openPromoStartModal;'));
const elements={};const keys=['promoLinkedPromotionId','jpLinkedPautaContext','jpLinkedPautaContextName','jpLinkedStatus','promoId','promoKind','promoStation','promoStartDate','promoEndDate','promoName','promoDescription','promoReadMethod'];keys.forEach(k=>elements[k]={value:'',hidden:false,textContent:'',focus(){this.focused=true;}});
elements.promoKind.value='promo';
let created=0,tab='';let state={months:{'2026-10':{promos:[]}}};
const context={state,$:id=>elements[id],consolidatedPromoById:id=>state.months['2026-10'].promos.find(p=>p.id===id),startPromoRegistration(k){created++;elements.promoKind.value=k;},promoAV57UpdateScheduleUI(){},updatePromoPreview(){},promoEditorShowTab(v){tab=v;}};
vm.createContext(context);vm.runInContext(fragment,context);
const original={id:'P1',name:'OKTOBERFEST 2026',startDate:'2026-10-17',endDate:'2026-10-31',station:'JP1017'};
context.jpOpenLinkedPautaAfterSave(original);
assert.equal(created,1);assert.equal(elements.promoLinkedPromotionId.value,'P1');assert.equal(elements.promoReadMethod.value,'manual');assert.equal(elements.promoName.value,'PAUTA · OKTOBERFEST 2026');assert.equal(tab,'content');
assert.equal(context.jpLinkedPautasFor('P1').length,0);
state.months['2026-10'].promos.push({...original,kind:'promo'},{id:'PA1',kind:'pauta',linkedPromotionId:'P1',name:'PAUTA OKTOBERFEST'});
assert.equal(context.jpLinkedPautasFor('P1').length,1);
elements.promoKind.value='pauta';context.jpUpdateLinkedPautaForm();assert.equal(elements.jpLinkedPautaContext.hidden,false);
// No missing local asset/page; covers static links, not real navigation or Firebase.
for(const name of names){const source=fs.readFileSync(path.join(base,name),'utf8');for(const m of source.matchAll(/(?:href|src)=["']([^"']+)["']/g)){const link=m[1];if(/^https?:|^\/\/|^data:|^#|^mailto:|^javascript:/.test(link))continue;const dest=link.split(/[?#]/)[0];if(dest && !/[${}]/.test(dest))assert.ok(fs.existsSync(path.join(base,dest)),`${name} -> ${link}`);}}
console.log('PASS: AV58.1.25 links locais, estilos das 6 páginas, encadeamento pós-salvamento e vínculo de pauta sem duplicar');
