'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),C=require('../assets/jp-passport-core.js'),G=require('../assets/jp-passport-distribution-guard.js');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let passed=0;const test=(title,fn)=>Promise.resolve().then(fn).then(()=>{passed++;console.log('PASS',passed,title)});
const p={id:'PROMO1',kind:'promo',name:'P12 PASSAPORTE',occurrences:[{qtyPlanned:1,date:'2026-11-14',status:'PENDENTE'}]};
const d=(id)=>({id,prizeType:'ingresso',eventDate:'2026-12-26',show:'P12 TESTE',ticketDefaultUnit:'unit',reservas:[{id:'RS1',qty:1,unit:'pair',note:'PASSAPORTE'},{id:'RS2',qty:4,unit:'unit',note:'OUTROS'}],ar:10});
const base={months:{'2026-11':{promos:[p],distributions:[]},'2026-12':{promos:[],distributions:[d('P12A')]},'2027-01':{promos:[],distributions:[d('P12B')]}},passportCampaigns:{}};
const args={promoId:'PROMO1',monthKey:'2026-12',distributionId:'P12A',segment:'reservado',reservationId:'RS1',units:2,rights:2};
(async()=>{
 await test('vincula evento de outra competência à promoção original',()=>assert.equal(C.validateLink(base,args).ok,true));
 await test('protege consumo do par físico: um par equivale a duas unidades',()=>assert.equal(C.reservations(d('P12A'))[0].units,2));
 await test('diferencia reservas da mesma distribuição',()=>assert.equal(C.reservations(d('P12A')).length,2));
 await test('segmento escolhido é exigido',()=>assert.equal(C.validateLink(base,{...args,segment:''}).code,'INPUT'));
 await test('reserva válida é obrigatória',()=>assert.equal(C.validateLink(base,{...args,reservationId:''}).code,'SELECT_RESERVATION'));
 await test('ingresso individual contabilizado sem dupla conversão',()=>assert.equal(C.validateLink(base,{...args,reservationId:'RS2',units:2}).ok,true));
 await test('não permite reservar acima das unidades disponíveis',()=>assert.equal(C.validateLink(base,{...args,units:3}).code,'INSUFFICIENT_RESERVATION'));
 await test('não permite duplicar show vinculado',()=>{
  const state=structuredClone(base);state.passportCampaigns.abc={promoId:'PROMO1',rights:2,events:[{monthKey:'2026-12',distributionId:'P12A',segment:'reservado',reservationId:'RS1',units:2}]};
  assert.equal(C.validateLink(state,args).code,'DUPLICATE');
 });
 await test('impede que dois passaportes consumam a mesma reserva',()=>{
  const state=structuredClone(base);state.passportCampaigns.other={promoId:'PROMO2',rights:2,events:[{monthKey:'2026-12',distributionId:'P12A',segment:'reservado',reservationId:'RS1',units:2}]};
  assert.equal(C.validateLink(state,args).code,'INSUFFICIENT_RESERVATION');
 });
 await test('bloqueia redução ou exclusão de reserva comprometida',()=>{
  const state=structuredClone(base);state.passportCampaigns.other={promoId:'PROMO2',events:[{monthKey:'2026-12',distributionId:'P12A',segment:'reservado',reservationId:'RS1',units:2}]};
  let changed=d('P12A');changed.reservas[0].qty=0;assert.equal(C.assertDistributionChange(state,'2026-12',changed).ok,false);
 });
 await test('salva vínculos em banco público somente como metadados, sem CPF',()=>{
  const js=read('assets/jp-promo-passport-links.js');
  assert(js.includes('data.passportCampaigns='));
  assert(js.includes('data.passportAudit='));
  assert(js.includes('rootRef().transaction'));
  assert(!js.includes('cpf')&&!js.includes('phone')&&!js.includes('passportPrivate'));
 });
 await test('fluxo permite inserir, consultar e desvincular',()=>{
  const js=read('assets/jp-promo-passport-links.js');
  assert(js.includes('async function open('));
  assert(js.includes('async function add('));
  assert(js.includes('async function unlink('));
  assert(js.includes('await fetchState()'));
  assert(js.includes('if(!outcome?.committed)'));
 });
 await test('atalho de eventos visível na lista e no editor original',()=>{
  const html=read('index.html');
  assert(html.includes('data-jp-passport-promo='));
  assert(html.includes('id="jpPromoLinkEventsBtn"'));
  assert(html.includes('VINCULAR / EDITAR EVENTOS'));
 });
 await test('Firebase segue fonte única dos eventos e reservas',()=>{
  const js=read('assets/jp-promo-passport-links.js');
  assert(js.includes('await rootRef().once'));
  assert(js.includes('snapshot?.months'));
 });
 await test('guard impede apagar prêmio vinculado',async()=>{
  const st={passportCampaigns:{test:{events:[{distributionId:'P12A',monthKey:'2026-12',units:2}]}}};
  const ref={child:()=>({get:async()=>({val:()=>st.passportCampaigns})})};
  await assert.rejects(G.verifyDeletion(ref,'P12A'),/VINCULADO/);
  assert.equal((await G.verifyDeletion(ref,'P12B')).ok,true);
 });
 await test('painel da Promo Externa usa identidade monocromática e cabeçalho único',()=>{
  const html=read('promo_externa.html'),css=read('assets/jp-promo-externa.css');
  assert(html.includes('<h1>PROMO EXTERNA</h1>'));
  assert(html.includes('id="jpExtLogin" class="jpExtConnectionDot"'));
  assert(!html.includes('JP WORKSPACE · OPERAÇÃO EXTERNA'));
  assert(css.includes('grid-template-columns:minmax(235px,24fr)'));
  assert(css.includes('background:#9e6475'));
 });
 await test('bolinha acompanha conexão Firebase real e sinaliza três cores',()=>{
  const js=read('assets/jp-promo-externa-pages.js'),css=read('assets/jp-promo-externa.css');
  assert(js.includes(".ref('.info/connected')"));
  ['connected','connecting','offline'].forEach(k=>assert(css.includes('[data-connection="'+k+'"]')));
 });
 await test('removido rodapé com entrada Google; login permanece pelo indicador acessível',()=>{
  const html=read('promo_externa.html');
  assert(!html.includes('ENTRAR COM GOOGLE'));
  assert(!html.includes('NOME DO RESPONSÁVEL'));
  assert(html.includes('title="Conectando ao Firebase'));
  assert(html.includes('id="jpExtMessage"'));
 });
 await test('CPF permanece opcional e inativo sem regras privadas',()=>{
  const html=read('promo_externa.html');
  assert(html.includes('CPF (OPCIONAL)'));
  assert(html.includes('id="jpExtCpf" disabled'));
 });
 await test('busca por ação e por ganhador vinculada a entradas reais',()=>{
  const html=read('promo_externa.html'),js=read('assets/jp-promo-externa-pages.js');
  assert(html.includes('id="jpExtActionSearch"'));
  assert(html.includes('id="jpExtWinnerSearch"'));
  assert(js.includes("element('jpExtActionSearch')?.addEventListener('input',renderStudio)"));
  assert(js.includes("element('jpExtWinnerSearch')?.addEventListener('input',renderStudio)"));
 });
 console.log('PROMO_EXTERNA_SOFT_LINK_QA',passed,'PASS 0 FAIL');
})().catch(e=>{console.error(e);process.exitCode=1});

