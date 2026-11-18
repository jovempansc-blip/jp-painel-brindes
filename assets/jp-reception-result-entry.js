/* JP Board Room / candidate HML — register first or subsequent promotion winner from reception.
 * Reuses existing promoWinnerStore transaction and central winnerBank; no parallel datastore.
 */
(function () {
  'use strict';
  let busy=false;
  const clean=x=>String(x||'').trim().replace(/\s+/g,' ');
  async function saveResult(button){
    if(busy)return;
    const host=button.closest('.campaignWinnerEmpty');
    const name=clean(host?.querySelector('[data-reception-winner-name]')?.value).toUpperCase();
    const phone=clean(host?.querySelector('[data-reception-winner-phone]')?.value);
    const id=String(button.dataset.receptionCreateWinner||'');
    const date=String(button.dataset.receptionDate||'');
    const time=timeToHHMM(button.dataset.receptionTime||'');
    if(!name){showReceptionToast('INFORME O NOME DO GANHADOR.',true);return;}
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time)){
      showReceptionToast('HORÁRIO DO SORTEIO INVÁLIDO. ATUALIZE A FICHA.',true);return;
    }
    const promo=receptionPromosForDate(date).find(p=>p.id===id)||receptionAllPromos().find(p=>p.id===id);
    if(!promo||promo.kind!=='promo'){showReceptionToast('PROMOÇÃO NÃO ENCONTRADA.',true);return;}
    const occ=(promo.occurrences||[]).find(o=>o.date===date&&timeToHHMM(o.time||promo.drawTime)===time);
    if(!occ&&!(promo.drawDate===date&&timeToHHMM(promo.drawTime)===time)){
      showReceptionToast('ESTE SORTEIO NÃO CONSTA NA PROGRAMAÇÃO OFICIAL.',true);return;
    }
    const capacity=Math.max(1,Number(occ?.qtyPlanned||promo.winnersPerDraw||promo.qtyPerDraw||1));
    const keyCandidates=[`${date}-${time.replace(':','')}`,`${date}-${time.slice(0,2)}`];
    const key=keyCandidates.find(k=>Array.isArray(promo.resultWinnersByHour?.[k]))||keyCandidates[0];
    const previous=Array.isArray(promo.resultWinnersByHour?.[key])?promo.resultWinnersByHour[key]:[];
    if(previous.length>=capacity){showReceptionToast('TODOS OS GANHADORES PREVISTOS JÁ FORAM CADASTRADOS.',true);return;}
    const sourceRef=promoWinnerSourceRef(promo,date,time),distribution=distributionById(promo.distributionId)||{};
    const context={sourceRef,date,time,slot:time.replace(':','H').replace(/H00$/,'H'),
      program:String(promo.resultProgram||promo.program||'RECEPÇÃO').toUpperCase(),
      prize:String(promo.prizeTitle||distribution.title||distribution.prize||promo.name||'PROMOÇÃO').toUpperCase()};
    const person=promoWinnerNormalize({id:'PW_'+promoWinnerToken(sourceRef+'|'+name+'|'+Date.now()),name,fullName:name,phone,profileVersion:0},promo);
    const initial=previous.map(w=>typeof w==='string'?{name:w}:w);
    const operator=receptionOperatorIdentity();
    busy=true;button.disabled=true;button.textContent='SALVANDO NO FIREBASE...';
    try{
      await ensureReceptionOnline();
      const result=await promoWinnerStore({stateRef:firebaseRef,bankRef:receptionWinnerBankRef,
        promo,occurrenceKey:key,winners:[...initial,person],context,operator,
        monthKeys:receptionRecordMonths('promos',promo.id,date),months:state.months,
        validateRemote:live=>{if(live.kind!=='promo')throw new Error('PROMOÇÃO ALTERADA NO BANCO.');}});
      const returned=Array.isArray(result.rows)?result.rows:Object.values(result.rows||{}).filter(Boolean);
      const saved=returned.find(p=>p.id===promo.id)?.resultWinnersByHour?.[key]||[];
      if(!saved.some(w=>String(w.name||'').toUpperCase()===name))throw new Error('O FIREBASE NÃO CONFIRMOU O NOME INFORMADO. NÃO REPITA A OPERAÇÃO; ACIONE OPERAÇÕES.');
      if(state.months[result.monthKey])state.months[result.monthKey].promos=returned;
      render();
      showReceptionToast('GANHADOR SALVO NO CADASTRO ORIGINAL. COMPLETE OS DEMAIS DADOS NA FICHA.');
    }catch(error){showReceptionToast('NÃO FOI POSSÍVEL CONFIRMAR: '+(error.message||error),true);}
    finally{busy=false;button.disabled=false;button.textContent='SALVAR GANHADOR';}
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-reception-create-winner]');
    if(button){event.preventDefault();saveResult(button);}
  });
})();
