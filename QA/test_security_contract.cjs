const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const R=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(R,p),'utf8');
const C=require('../assets/jp-promo-externa-core.js');global.JPExternalCore=C;
const Store=require('../assets/jp-promo-externa-firebase.js');
let passed=0;
function test(n,fn){fn();console.log('PASS',++passed,n)}
test('write lock fails closed until A09 confirms private Firebase bank',()=>{
 const db={ref:()=>({})};let e='';try{new Store(db,{auth:{currentUser:{uid:'op'}}}).checkAuth()}catch(x){e=x.message;}
 assert.match(e,/ESCRITA BLOQUEADA/);
});
test('no production configuration embedded in independent studio/reception',()=>{
 for(const p of ['promo_externa.html','recepcao_externa.html']){
  const s=read(p);assert(s.includes('jp-promo-externa-env.js'));assert(!s.includes('AIzaSy'));assert(!s.includes('jp-painel-brindes-default-rtdb'));
 }
});
test('production fail-closed environment',()=>{
 const env=read('assets/jp-promo-externa-env.js');assert(env.includes('JP_EXT_FIREBASE_CONFIG = null'));assert(env.includes('JP_EXT_SECURE_BANK_VERIFIED = false'));
});
test('PII must not be stored on distribution branch',()=>{
 const core=read('assets/jp-promo-externa-core.js');assert(core.includes('const winner={id:winnerId'));const line=core.split('const winner={id:winnerId')[1].split(';')[0];assert(!line.includes('phone'));assert(!line.includes('name'));
});
test('winnerBank stages personal data until source commit',()=>{
 const src=read('assets/jp-promo-externa-firebase.js');assert(src.includes("'pendingExternal/EXTERNA_'+winnerId"));assert(src.includes('await pendingRef.set('));assert(src.includes('await pendingRef.remove()'));assert(src.includes('bankRoot.child(\'records/\'+recordKey)'));
});
test('independent reception never discounts stock on pickup',()=>{
 const c=read('assets/jp-promo-externa-core.js');const code=c.split('function registerPickup(')[1].split('function cancelWinner(')[0];assert(!code.includes('d.rua='));assert(!code.includes('action.allocatedUnits='));assert(code.includes("winner.status='RETIRADO'"));
});
test('registered time comes from Firebase server placeholders',()=>{
 const src=read('assets/jp-promo-externa-firebase.js');assert(src.includes('ServerValue?.TIMESTAMP'));assert(src.includes('registeredAtMs'));
});
test('Main preserves action history and stops quota shrink',()=>{
 const src=read('index.html');assert(src.includes('d.externalActions=clone(existing.externalActions||{})'));assert(src.includes('C.quotaUnits(d)<reserved'));assert(src.includes('copy.externalActions={}'));
});
test('recipient panel distinguishes pickup from registration',()=>{
 const src=read('assets/jp-promo-externa-pages.js');assert(src.includes('store.pickup(payload,operator)'));assert(src.includes('allWinners()'));assert(src.includes('deliveredAtMs'));assert(src.includes('bankRecords'));
});
test('new program respects original Workspace navigation',()=>{
 const src=read('index.html');assert(src.includes('data-view="externa"'));assert(src.includes('id="view-externa"'));assert(src.includes('JPExternalMain?.render()'));
});
console.log('SUMMARY',passed,'/10 PASS');
