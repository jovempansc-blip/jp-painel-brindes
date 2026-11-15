'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const P=require('../assets/jp-promo-expiry.js'),root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const rec=fs.readFileSync(path.join(root,'preview_recepcao.html'),'utf8');
const start=source.indexOf('function promoOccurrenceStockUnits('),end=source.indexOf('function uniqueConsolidatedPromos(',start);
assert(start>=0&&end>start,'main official allocation stock function absent');
const ctx={window:{JPPromoExpiry:P},state:{passportCampaigns:{}},num:v=>Math.max(0,Number(v)||0),normalizeStatus:s=>String(s||'').toUpperCase(),todayISO:()=> '2026-11-15',Math,Number,String,Array,Object};
vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
const winner=[{id:'W1',name:'PESSOA FICTÍCIA PRIMEIRA',registeredAt:'2026-11-02T10:00:00',deliveredAt:''},
 {id:'W2',name:'PESSOA FICTÍCIA SEGUNDA',registeredAt:'2026-11-02T10:00:00',deliveredAt:'2026-11-04T10:00:00'}];
const base={id:'PROMO_TEST',campaignMode:'single',drawDate:'2026-11-02',resultDate:'2026-11-02',
 pickupBusinessDays:5,winnersPerDraw:2,unitsPerWinner:2,
 occurrences:[{date:'2026-11-02',time:'10:00',status:'REALIZADO',qtyPlanned:2,unitsPerWinner:2}],
 resultWinnersByHour:{'2026-11-02-1000':winner}};
let n=0;const test=(name,fn)=>{fn();n++;console.log('PASS',n,name)};
test('cinco dias úteis a partir de 2 novembro encerra em 9 novembro',()=>assert.equal(P.deadline('2026-11-02',5),'2026-11-09'));
test('dia do vencimento não devolve ingresso',()=>assert.equal(P.releasedUnits(base,base.occurrences[0],'2026-11-09'),0));
test('dia seguinte devolve um par não retirado',()=>assert.equal(P.releasedUnits(base,base.occurrences[0],'2026-11-10'),2));
test('dia seguinte preserva o par já retirado',()=>assert.equal(ctx.promoCommitmentQty(base,'2026-11-10'),2));
test('dia de registro possui compromisso das duas cotas',()=>assert.equal(ctx.promoCommitmentQty(base,'2026-11-02'),4));
test('devolução não ocorre duas vezes na contagem de saldo',()=>{assert.equal(ctx.promoCommitmentQty(base,'2026-11-15'),2);assert.equal(ctx.promoCommitmentQty(base,'2026-11-15'),2);});
test('sem mutação do resultado original',()=>{const initial=JSON.stringify(base);ctx.promoCommitmentQty(base,'2026-11-15');assert.equal(JSON.stringify(base),initial)});
test('um Passaporte já vinculado não consome cota do prêmio-base',()=>assert.equal(ctx.promoCommitmentQty({...base,campaignMode:'passport'},'2026-11-15'),0));
test('sem vencedor registrado não retorna ingressos por engano',()=>assert.equal(ctx.promoCommitmentQty({...base,resultWinnersByHour:{}},'2026-11-15'),4));
test('sorteio cancelado não bloqueia cota',()=>assert.equal(ctx.promoCommitmentQty({...base,occurrences:[{...base.occurrences[0],status:'CANCELADO'}]},'2026-11-15'),0));
test('sorteio futuro não é liberado enquanto campanha ativa',()=>assert.equal(ctx.promoCommitmentQty({...base,endDate:'2026-11-30',occurrences:[{...base.occurrences[0],date:'2026-11-30',status:'PENDENTE'}]},'2026-11-15'),4));
test('vários vencedores não liberam mais do que quantidade planejada',()=>{
 const q=structuredClone(base);q.resultWinnersByHour['2026-11-02-1000']=Array.from({length:10},(_,i)=>({...winner[0],id:'D'+i}));
 assert.equal(P.releasedUnits(q,q.occurrences[0],'2026-11-15'),4);
});
test('registro por timestamp numérico funciona',()=>assert.equal(P.deadline(Date.UTC(2026,10,2,15,0),5),'2026-11-09'));
test('registro nominal tardio muda a data de prazo',()=>assert.equal(P.releasedUnits({...base,resultWinnersByHour:{'2026-11-02-1000':[{...winner[0],registeredAt:'2026-11-13T10:00:00'}]}},base.occurrences[0],'2026-11-15'),0));
test('retirada tardia não pode ocorrer na promoção já devolvida',()=>assert(rec.includes("(row.source==='promo'||row.promoResultId)&&row.expired&&!row.deliveredAt")));
test('retirada no fluxo de perfil também bloqueia vencidos',()=>assert(rec.includes('RETIRADA BLOQUEADA: PRAZO ENCERRADO E COTA PROMOCIONAL LIBERADA')));
test('tela da Recepção conserva histórico da promoção vencida',()=>assert(rec.includes('PRAZO ENCERRADO<br>COTA DISPONÍVEL')));
test('o código principal não escreve uma segunda entrada física no estoque',()=>assert(!fs.readFileSync(path.join(root,'assets/jp-promo-expiry.js'),'utf8').includes('firebase')));
console.log('PROMO_PILOT_EXPIRY',n,'PASS 0 FAIL');