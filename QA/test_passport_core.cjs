const A=require('node:assert/strict');
const C=require('../assets/jp-passport-core.js');
let n=0;const check=(title,fn)=>{fn();console.log('PASS',++n,title)};
const p={id:'PROMO_X',name:'Passaporte P12',kind:'promo',occurrences:[{date:'2026-11-14',qtyPlanned:2,status:'AGENDADO'}],resultWinnersByHour:{'2026-11-14_10H':[{id:'W1',name:'Pessoa Um'},{id:'W2',name:'Pessoa Dois'}]}};
const d={id:'EVENT_A',prizeType:'ingresso',total:100,ticketDefaultUnit:'unit',ticketUnits:{ar:'pair',rs:'unit'},
 ar:5,rs:10,reservas:[{id:'RSV_A',qty:3,unit:'pair',note:'PASSAPORTE'},{id:'RSV_B',qty:6,unit:'unit',note:'CONVITES'}]};
const make=()=>({months:{'2026-12':{promos:[structuredClone(p)],distributions:[structuredClone(d)]}},passportCampaigns:{}});
function link(s,opts={}){return C.validateLink(s,{promoId:'PROMO_X',monthKey:'2026-12',distributionId:'EVENT_A',
 segment:'reservado',reservationId:'RSV_A',units:4,rights:2,...opts})}
check('normaliza pares para duas unidades físicas',()=>A.equal(C.reservations(d)[0].units,6));
check('normaliza reservas individuais',()=>A.equal(C.reservations(d)[1].units,6));
check('capacidade total reservada não conta pacotes',()=>A.equal(C.capacity(d,'reservado'),12));
check('Rádio com 5 pares representa 10 unidades',()=>A.equal(C.capacity(d,'ar'),10));
check('RS com 10 individuais representa 10 unidades',()=>A.equal(C.capacity(d,'rs'),10));
check('promoção com 2 ganhadores programados',()=>A.equal(C.plannedWinners(p),2));
check('resultado tem IDs estáveis',()=>A.equal(C.winnerRows(p)[0].id,'W1'));
check('vínculo válido',()=>A.equal(link(make()).ok,true));
check('seleção obrigatória quando reservas múltiplas',()=>A.equal(link(make(),{reservationId:''}).code,'SELECT_RESERVATION'));
check('bloqueia reserva inexistente',()=>A.equal(link(make(),{reservationId:'NAO_EXISTE'}).code,'RESERVATION_NOT_FOUND'));
check('bloqueia excesso na reserva individual',()=>A.equal(link(make(),{reservationId:'RSV_A',units:7}).code,'INSUFFICIENT_RESERVATION'));
check('bloqueia excesso no segmento',()=>A.equal(link(make(),{units:13}).code,'INSUFFICIENT_SEGMENT'));
check('bloqueia direito insuficiente para 2 ganhadores',()=>A.equal(link(make(),{units:2}).code,'INSUFFICIENT_WINNERS'));
check('bloqueia quantidade fracionada',()=>A.equal(link(make(),{units:4.5}).code,'INPUT'));
check('bloqueia segmento inválido',()=>A.equal(link(make(),{segment:'x'}).code,'INPUT'));
check('bloqueia distribuição de outro mês',()=>A.equal(link(make(),{monthKey:'2027-01'}).code,'DIST'));
check('bloqueia prêmio brinde',()=>{const s=make();s.months['2026-12'].distributions[0].prizeType='brinde';A.equal(link(s).code,'NOT_TICKET')});
check('bloqueia promoção ausente',()=>A.equal(link(make(),{promoId:'OUTRA'}).code,'PROMO'));
check('bloqueia duplicidade no mesmo passaporte',()=>{
 const s=make();s.passportCampaigns['hex']={promoId:'PROMO_X',rights:2,events:[{monthKey:'2026-12',distributionId:'EVENT_A',segment:'reservado',reservationId:'RSV_A',units:4}]};
 A.equal(link(s).code,'DUPLICATE');
});
check('bloqueia direitos diferentes em campanha já iniciada',()=>{
 const s=make();s.passportCampaigns['hex']={promoId:'PROMO_X',rights:3,events:[{monthKey:'2026-12',distributionId:'EVENT_B',segment:'reservado',units:6}]};
 A.equal(link(s,{rights:2}).code,'RIGHTS_LOCKED');
});
check('bloqueia compromisso concorrente do mesmo segmento',()=>{
 const s=make();s.passportCampaigns['passb']={promoId:'PROMO_Y',events:[{monthKey:'2026-12',distributionId:'EVENT_A',segment:'reservado',reservationId:'RSV_A',units:5}]};
 A.equal(link(s,{units:4}).code,'INSUFFICIENT_RESERVATION');
});
check('permite usar outra reserva ainda disponível',()=>{
 const s=make();s.passportCampaigns['passb']={promoId:'PROMO_Y',events:[{monthKey:'2026-12',distributionId:'EVENT_A',segment:'reservado',reservationId:'RSV_A',units:5}]};
 A.equal(link(s,{reservationId:'RSV_B',units:4}).ok,true);
});
check('bloqueia redução posterior da reserva vinculada',()=>{
 const s=make();s.passportCampaigns['xx']={events:[{monthKey:'2026-12',distributionId:'EVENT_A',segment:'reservado',reservationId:'RSV_A',units:4}]};
 const proposed=structuredClone(d);proposed.reservas[0].qty=1;
 const result=C.assertDistributionChange(s,'2026-12',proposed);A.equal(result.ok,false);A.match(result.reason,/RSV_A/);
});
check('bloqueia redução posterior do segmento de rádio',()=>{
 const s=make();s.passportCampaigns['xx']={events:[{monthKey:'2026-12',distributionId:'EVENT_A',segment:'ar',units:8}]};
 const proposed=structuredClone(d);proposed.ar=3;A.equal(C.assertDistributionChange(s,'2026-12',proposed).ok,false);
});
check('não bloqueia aumento de reserva comprometida',()=>{
 const s=make();s.passportCampaigns['xx']={events:[{monthKey:'2026-12',distributionId:'EVENT_A',segment:'reservado',reservationId:'RSV_A',units:4}]};
 const proposed=structuredClone(d);proposed.reservas[0].qty=5;A.equal(C.assertDistributionChange(s,'2026-12',proposed).ok,true);
});
check('bloqueia remover a reserva do passaporte',()=>{
 const s=make();s.passportCampaigns['xx']={events:[{monthKey:'2026-12',distributionId:'EVENT_A',segment:'reservado',reservationId:'RSV_A',units:4}]};
 const proposed=structuredClone(d);proposed.reservas.shift();A.equal(C.assertDistributionChange(s,'2026-12',proposed).ok,false);
});
check('não interfere em outro evento',()=>{
 const s=make();s.passportCampaigns['xx']={events:[{monthKey:'2026-12',distributionId:'EVENT_B',segment:'reservado',units:5}]};
 A.equal(C.assertDistributionChange(s,'2026-12',d).ok,true);
});
check('CPF válido (somente dado sintético)',()=>A.equal(C.validateCpf('52998224725'),true));
check('CPF sequência inválida',()=>A.equal(C.validateCpf('11111111111'),false));
check('CPF com dígitos verificadores inválidos',()=>A.equal(C.validateCpf('12345678901'),false));
check('nome completo obrigatório',()=>A.equal(C.validBeneficiary({name:'ABC',cpf:'52998224725'}),false));
check('nome e CPF válidos',()=>A.equal(C.validBeneficiary({name:'Pessoa Ficticia',cpf:'52998224725'}),true));
check('não permite baixa sem identificação',()=>A.equal(C.transition({status:'IDENTIFICADO'},{status:'UTILIZADO',name:'Pessoa Ficticia',cpf:''}).ok,false));
check('não permite segunda baixa',()=>A.equal(C.transition({status:'UTILIZADO'},{status:'UTILIZADO',name:'Pessoa Ficticia',cpf:'52998224725'}).ok,false));
check('não permite transferência de ingresso utilizado',()=>A.equal(C.transition({status:'UTILIZADO',name:'A'},{status:'IDENTIFICADO',name:'Pessoa Ficticia',cpf:'52998224725'}).ok,false));
check('permite passagem de identificado para utilizado',()=>A.equal(C.transition({status:'IDENTIFICADO'},{status:'UTILIZADO',name:'Pessoa Ficticia',cpf:'52998224725'}).ok,true));
console.log('PASSAPORTE CORE',n,'PASS 0 FAIL');

