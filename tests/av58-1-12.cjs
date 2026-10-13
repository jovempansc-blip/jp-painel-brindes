const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const main=fs.readFileSync('index.html','utf8');
const rec=fs.readFileSync('preview_recepcao.html','utf8');
const select=(src,a,b)=>{const i=src.indexOf(a);const j=src.indexOf(b,i+a.length);assert(i>=0&&j>i,'Trecho não encontrado: '+a);return src.slice(i,j);};
const statusSrc=select(main,'function promoStatusData(p){','function promoReadHoursLabel(p){');
const m={norm:x=>String(x||'').toUpperCase(),todayISO:()=> '2026-10-12',promoTypeKey:p=>p.kind||'promo',normalizeStatus:x=>String(x||'').toUpperCase()};vm.createContext(m);vm.runInContext(statusSrc,m);
const promo={kind:'promo',startDate:'2026-10-10',endDate:'2026-10-12',occurrences:[{date:'2026-10-12',time:'16:00',status:'AGENDADO',qtyPlanned:2}]};
assert.equal(m.promoStatusData(promo).key,'active','Sorteio ainda pendente não pode encerrar');
promo.occurrences[0]={...promo.occurrences[0],status:'REALIZADO',actualQty:2,resultAt:'2026-10-12T16:00:00'};
assert.equal(m.promoStatusData(promo).key,'ended','Resultado confirmado deve encerrar no dia');
promo.occurrences.push({date:'2026-10-13',time:'16:00',status:'AGENDADO'});
assert.equal(m.promoStatusData(promo).key,'active','Sorteio futuro impede encerramento');
const pauta={kind:'pauta',startDate:'2026-10-10',endDate:'2026-10-12',occurrences:[{status:'REALIZADO',actualQty:1}]};
assert.equal(m.promoStatusData(pauta).key,'active','Pauta não deve usar regra de resultado');
const controls={receptionCampaignList:{innerHTML:''},receptionCampaignCount:{textContent:''},searchFilter:{value:''}};
const p={id:'PROMO1',kind:'promo',name:'PROMOÇÃO TESTE',prizeTitle:'PAR DE INGRESSOS',startDate:'2026-10-01',endDate:'2026-10-10',occurrences:[{date:'2026-10-10',time:'16:00',status:'REALIZADO',actualQty:2}]};
const rows=[
 {source:'promo',id:'PROMO1',winnerId:'PW1',winnerIndex:0,occurrenceKey:'2026-10-10-1600',date:'2026-10-10',result:'GANHADORA TESTE 1',expired:true,deadlineLabel:'PRAZO VENCIDO',deliveredAt:'',profileManaged:true,profileReady:true,companionCount:1},
 {source:'promo',id:'PROMO1',winnerId:'PW2',winnerIndex:1,occurrenceKey:'2026-10-10-1600',date:'2026-10-10',result:'GANHADOR TESTE 2',expired:false,deadlineLabel:'PRAZO ATÉ 19/10/2026',deliveredAt:'2026-10-12T12:00:00',profileManaged:true,profileReady:true,companionCount:0},
];
const profiles={PW1:{w:{id:'PW1',companions:[{name:'ACOMPANHANTE TESTE'}]},p},PW2:{w:{id:'PW2'},p}};
const r={
  receptionIsCampaign:p=>p.kind==='promo',
  $:id=>controls[id],document:{querySelectorAll:()=>[]},todayISO:()=> '2026-10-12',
  receptionPromosForDate:()=>[p],promoWinnerOccurrences:()=>[],
  promoTitle:p=>p.name,promoPrizeTitle:p=>p.prizeTitle,
  receptionPromoProfile:row=>profiles[row.winnerId]||null,
  promoWinnerRules:(p,w)=>({companionsPerWinner:w.id==='PW1'?1:0,companionFields:{name:'pickup'}}),
  upper:x=>String(x||'').toUpperCase(),searchKey:x=>String(x||'').toUpperCase(),
  formatBR:x=>String(x||''),formatTime:x=>String(x||''),timeToHHMM:x=>String(x||''),
  esc:x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
};vm.createContext(r);
vm.runInContext(select(rec,'function receptionCampaignVisible(p){','/* RECEPTION_CAMPAIGNS_END */'),r);
let g=r.receptionCampaignState(p,rows,'2026-10-12');
assert.equal(g.visible,true,'Encerrada vencida deve permanecer na Recepção');
assert.equal(g.ended,true);assert.equal(g.expired,true);assert.equal(g.pending.length,1);
r.renderReceptionCampaigns(rows);
assert.match(controls.receptionCampaignList.innerHTML,/FORA DO PRAZO DE RETIRADA/);
assert.match(controls.receptionCampaignList.innerHTML,/RESULTADOS CONFIRMADOS/);
assert.match(controls.receptionCampaignList.innerHTML,/GANHADORA TESTE 1/);
assert.match(controls.receptionCampaignList.innerHTML,/ACOMPANHANTE TESTE/);
assert.doesNotMatch(controls.receptionCampaignList.innerHTML,/GANHADOR TESTE 2/,'Retirado não deve continuar em destaque');
assert.match(controls.receptionCampaignList.innerHTML,/data-reception-winner-open/);
rows[0].deliveredAt='2026-10-12T17:00:00';
assert.equal(r.receptionCampaignState(p,rows,'2026-10-12').visible,false,'Sai da frente depois que todos retiraram');
r.renderReceptionCampaigns(rows);
assert.doesNotMatch(controls.receptionCampaignList.innerHTML,/GANHADORA TESTE 1/);
rows[0].deliveredAt='';
p.occurrences[0].status='AGENDADO';p.occurrences[0].actualQty=0;
assert.equal(r.receptionCampaignState(p,rows,'2026-10-12').visible,true,'Encerrada com resultado pendente deve permanecer');
// Campanha antiga sem obrigação registrada e sem sorteio pendente não deve retornar.
const former={...p,id:'OLD',occurrences:[{date:'2026-10-01',time:'16:00',status:'REALIZADO',actualQty:1}]};
assert.equal(r.receptionCampaignState(former,[],'2026-10-12').visible,false);
const carryover={...p,id:'PROMO_ANTIGA',startDate:'2026-09-01',endDate:'2026-09-30',occurrences:[{date:'2026-09-30',time:'16:00',status:'REALIZADO',actualQty:1}]};
const pendingPreviousMonth=[{source:'promo',id:'PROMO_ANTIGA',winnerIndex:0,date:'2026-09-30',deliveredAt:'',expired:true}];
assert.equal(r.receptionCampaignState(carryover,pendingPreviousMonth,'2026-10-12').visible,true,'Pendência atravessando mês não pode sumir');
const missed={...carryover,occurrences:[{date:'2026-09-30',time:'16:00',status:'AGENDADO'}]};
assert.equal(r.receptionCampaignState(missed,[],'2026-10-12').visible,true,'Sorteio sem resultado deve permanecer pendente');
assert.match(rec,/receptionMonthsRef\.on\('child_changed'/,'Listener de atualização sem F5 preservado');
assert.match(main,/monthsRef\.on\('child_changed'/,'Listener do Principal preservado');
assert.match(rec,/FORA DO PRAZO DE RETIRADA<br>AINDA NÃO RETIRADO/,'Expiração não pode indicar reaproveitamento automático');
console.log('PASS: AV58.1.12 encerramento 16h, resultado, atraso, acompanhantes, baixa individual e listeners (simulado)');
