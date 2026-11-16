'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'assets/jp-promo-externa-reception-bridge.js'),'utf8');
const html=fs.readFileSync(path.join(root,'preview_recepcao.html'),'utf8');
const passport=fs.readFileSync(path.join(root,'assets/jp-reception-passport.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/jp-reception-passport.css'),'utf8');
let pass=0;const test=(name,fn)=>{fn();console.log('PASS',++pass,name)};
let tab='externa',query='',dbSubscriptions=0,pickups=0,authCalled=0;
const host={innerHTML:'',textContent:'',handlers:{},addEventListener(type,fn){this.handlers[type]=fn}};
const count={textContent:''},section={hidden:true},topBadge={textContent:''},search={get value(){return query},addEventListener(){}};
const document={getElementById(id){return ({
 jpExternalReceptionRows:host,jpExternalReceptionCount:count,jpExternalReceptionSection:section,
 receptionCampaignCount:topBadge,searchFilter:search
})[id]||null}};
const actions=[{id:'RADIO_CELEBRATE',title:'RÁDIO CELEBRATE · MEDUZA',prize:'PAR DE INGRESSOS',
 distributionMonth:'2026-11',deliveryUnit:'pair',
 winners:Array.from({length:20},(_,i)=>({id:'W'+i,actionId:'RADIO_CELEBRATE',
 distributionId:'D12',status:'AGUARDANDO_RETIRADA',bankStatus:'CONFIRMADO',
 quantity:1,deliveryUnit:'pair',registeredAtMs:1795000000000+i}))}];
const people=Object.fromEntries(actions[0].winners.map((w,i)=>['EXTERNA_'+w.id,{
 id:'EXTERNA_'+w.id,name:'TITULAR FICTÍCIO '+i,phone:'48999887766',
 ...(i%2===0?{cpf:'52998224725'}:{}),
 companion:{name:'ACOMPANHANTE FICTÍCIO '+i,phone:'48988776655',...(i%2===0?{cpf:'52998224725'}:{})}
}]));
const db={ref(){return{on(type,fn){dbSubscriptions++;fn({val:()=>people})},off(){}}}};
class DB{constructor(db,settings){assert(settings.pilotMode===true)}
 onMonths(fn){dbSubscriptions++;fn({});return()=>{}}
 async pickup(){pickups++;return{deliveredAtMs:1795000000000,bankPickupPending:false};}
 async retryBankSync(){return true;}}
const win={JP_BOARD_PILOT_SYNTHETIC:true,JP_EXT_SECURE_BANK_VERIFIED:false,
 JPReceptionPassport:{get tab(){return tab}},
 JPExternalCore:{flatten:()=>actions},JPExternalRTDB:DB,
 firebase:{apps:[{}],app(){return{}},database(){return db},auth(){authCalled++;throw Error('Google login should not run')}},
 alert(){},prompt(){return'RECEPÇÃO PILOTO'},confirm(){return true}};
vm.runInNewContext(js,{window:win,document,console,Date,Number,String,Array,Object,Map,Promise});
const rendered=()=>host.innerHTML;
test('nativo: Promo Externa é quinta aba',()=>assert(passport.includes("passaportes','externa'].map")));
test('a aba permite ativação e volta às anteriores',()=>assert(passport.includes("['ativas','fixadas','historico','passaportes','externa'].includes(next)")));
test('o painel inferior separado foi retirado',()=>assert(html.includes('jpExternalReceptionEmbedded')&&!html.includes('class="receptionCampaignSection" id="jpExternalReceptionSection"')));
test('renderizador está embutido no painel principal',()=>assert(html.indexOf('id="receptionCampaignList"')<html.indexOf('id="jpExternalReceptionSection"')&&html.indexOf('id="jpExternalReceptionSection"')<html.indexOf('</section>',html.indexOf('id="receptionCampaignList"'))));
test('existe grupo de vinte ganhadores por promoção',()=>assert.equal((rendered().match(/class="jpExtCompactGroup"/g)||[]).length,1));
test('cada um dos vinte ganhadores tem uma faixa',()=>assert.equal((rendered().match(/class="jpExtCompactRow"/g)||[]).length,20));
test('título da promoção não é repetido dentro de cada faixa',()=>assert.equal((rendered().match(/RÁDIO CELEBRATE · MEDUZA/g)||[]).length,2)); // heading text + aria-label
test('cada faixa tem linha de titular e acompanhante',()=>assert.equal((rendered().match(/class="jpExtCompactPersonLine"/g)||[]).length,40));
test('nome, telefone e CPF do titular aparecem na primeira linha',()=>assert(rendered().includes('TITULAR FICTÍCIO 0')&&rendered().includes('TEL: (48) 99988-7766')&&rendered().includes('CPF: CADASTRADO')));
test('nome, telefone e CPF do acompanhante aparecem na segunda linha',()=>assert(rendered().includes('ACOMPANHANTE FICTÍCIO 0')&&rendered().includes('TEL: (48) 98877-6655')));
test('CPF ausente é identificado sem exigir preenchimento',()=>assert(rendered().includes('CPF: NÃO INFORMADO')));
test('CPF integral não é exposto na listagem',()=>assert(!rendered().includes('52998224725')));
test('a lista possui vinte botões de retirada e uma ação por ganhador',()=>assert.equal((rendered().match(/data-ext-pickup=/g)||[]).length,20));
test('cada faixa conserva status e quantidade',()=>assert(rendered().includes('1 PAR')&&rendered().includes('AGUARDANDO RETIRADA')));
test('o contador mantém as vinte retiradas',()=>assert.equal(topBadge.textContent,'20 A RETIRAR'));
test('busca por nome do acompanhante retorna só um cadastro',()=>{query='ACOMPANHANTE FICTÍCIO 17';win.JPExternalReceptionBridge.render();assert.equal((rendered().match(/class="jpExtCompactRow"/g)||[]).length,1)});
test('pesquisa por telefone do titular também funciona',()=>{query='99988';win.JPExternalReceptionBridge.render();assert.equal((rendered().match(/class="jpExtCompactRow"/g)||[]).length,20)});
test('recarregar sem busca restaura vinte linhas sem duplicação',()=>{query='';win.JPExternalReceptionBridge.render();assert.equal((rendered().match(/class="jpExtCompactRow"/g)||[]).length,20)});
test('outras quatro abas ocultam o quadro externo',()=>{tab='ativas';win.JPExternalReceptionBridge.render();assert.equal(section.hidden,true)});
test('a quinta aba exibe o quadro externo',()=>{tab='externa';win.JPExternalReceptionBridge.render();assert.equal(section.hidden,false)});
test('listagem tem altura máxima e rolagem interna',()=>assert(css.includes('#jpExternalReceptionRows{max-height:568px;overflow-y:auto')));
test('responsividade de tablet e celular',()=>assert(css.includes('@media(max-width:980px)')&&css.includes('@media(max-width:620px)')));
test('não exigiu login Google',()=>assert.equal(authCalled,0));
test('não perdeu listeners do Firebase simulado',()=>assert(dbSubscriptions>=2));
test('HTML referencia novas versões para invalidar cache',()=>assert(html.includes('jp-reception-passport.js?v=JP_EXTERNA_LISTA_COMPACTA_20261116')&&html.includes('jp-promo-externa-reception-bridge.js?v=JP_EXTERNA_LISTA_COMPACTA_20261116')));
(async()=>{
 await host.handlers.click({target:{closest(sel){return sel==='[data-ext-pickup],[data-ext-sync]'?{dataset:{extPickup:'W17'},disabled:false,textContent:''}:null}}});
 test('confirmação de retirada segue a mesma transação',()=>assert.equal(pickups,1));
 console.log('JP_RECEPTION_COMPACT',pass,'PASS 0 FAIL');
})().catch(e=>{console.error(e);process.exitCode=1});
