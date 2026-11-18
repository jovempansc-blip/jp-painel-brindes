/* JP Board Room / isolated candidate HML.
 * Inline entry from Distribution; writes ONLY through existing promoWinnerStore.
 * Does not create a free-standing record or deduct a second stock unit.
 */
(function(global){
  'use strict';
  let busy=false;
  const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const upperName=x=>String(x||'').trim().replace(/\s+/g,' ').toUpperCase();
  const entries=()=>Object.entries(state.months||{}).flatMap(([month,m])=>(m.promos||[])
    .filter(p=>p?.kind==='promo'&&!['CANCELADO','CANCELADA'].includes(String(p.status||'').toUpperCase()))
    .map(p=>({month,p})));
  const occurrenceList=p=>{
    const arr=Array.isArray(p.occurrences)&&p.occurrences.length?p.occurrences:
      [{date:p.drawDate||p.resultDate||p.startDate,time:p.drawTime||p.resultSlot,qtyPlanned:p.winnersPerDraw||p.qtyPerDraw||1}];
    return arr.filter(o=>/^\d{4}-\d{2}-\d{2}$/.test(o.date||'')&&!['CANCELADO','CANCELADA'].includes(String(o.status||'').toUpperCase()))
      .map(o=>({...o,normalizedTime:fullHourTimeValue(o.time||p.drawTime||p.resultSlot||'')}))
      .filter(o=>/^\d{2}:\d{2}$/.test(o.normalizedTime));
  };
  function close(){if(busy)return;global.document.getElementById('jpDistWinnerOverlay')?.remove();}
  global.openDistributionWinnerEntry=function(defaultDistributionId=''){
    if(global.document.getElementById('jpDistWinnerOverlay'))return;
    const available=entries();
    if(!available.length){alert('NENHUMA PROMOÇÃO CADASTRADA NO PAINEL.');return;}
    const matching=available.findIndex(x=>String(x.p.distributionId||'')===String(defaultDistributionId));
    const selected=matching>=0?matching:0;
    const overlay=global.document.createElement('div');overlay.id='jpDistWinnerOverlay';
    overlay.setAttribute('role','presentation');
    overlay.style.cssText='position:fixed;inset:0;z-index:100900;background:rgba(10,22,38,.64);display:flex;align-items:center;justify-content:center;padding:15px';
    overlay.innerHTML=`<section role="dialog" aria-modal="true" aria-label="Cadastrar ganhador de promoção" style="width:min(620px,100%);max-height:90vh;overflow:auto;background:white;color:#172134;border-radius:18px;padding:20px;box-shadow:0 22px 80px #1115;display:grid;gap:12px;font:600 13px Arial,sans-serif">
      <header style="display:flex;justify-content:space-between;align-items:center;gap:12px"><strong style="font-size:17px">CADASTRAR GANHADOR DE PROMOÇÃO</strong><button type="button" id="jpDistWinnerClose">FECHAR</button></header>
      <label>PROMOÇÃO <select id="jpDistWinnerPromo" style="width:100%;padding:10px;margin-top:5px">${available.map((x,i)=>`<option value="${i}" ${i===selected?'selected':''}>${safe(x.p.name||x.p.title||x.p.id)} · ${safe(x.month)}</option>`).join('')}</select></label>
      <label>DATA / HORÁRIO DO SORTEIO <select id="jpDistWinnerSlot" style="width:100%;padding:10px;margin-top:5px"></select></label>
      <label>NOME COMPLETO DO GANHADOR <input id="jpDistWinnerName" maxlength="140" autocomplete="off" placeholder="NOME E SOBRENOME" style="box-sizing:border-box;width:100%;padding:10px;margin-top:5px"></label>
      <label>TELEFONE / WHATSAPP (OPCIONAL) <input id="jpDistWinnerPhone" maxlength="22" autocomplete="off" placeholder="DDD + NÚMERO" style="box-sizing:border-box;width:100%;padding:10px;margin-top:5px"></label>
      <div style="font-size:12px;color:#5c687a">Apenas um novo ganhador por salvamento. O mesmo registro ficará visível no Estúdio e na Recepção; acompanhantes e dados pendentes podem ser completados posteriormente. Não altera a reserva de estoque.</div>
      <div id="jpDistWinnerFeedback" role="status" style="min-height:16px;font-size:12px"></div>
      <button id="jpDistWinnerSave" type="button" style="background:#be173c;color:white;border:0;border-radius:8px;padding:13px;font-weight:800">SALVAR GANHADOR NO FIREBASE</button>
    </section>`;
    global.document.body.appendChild(overlay);
    const $=id=>overlay.querySelector('#'+id),status=msg=>$('jpDistWinnerFeedback').textContent=msg;
    function refreshSlots(){
      const selectedPromo=available[Number($('jpDistWinnerPromo').value)]?.p;
      const list=selectedPromo?occurrenceList(selectedPromo):[];
      $('jpDistWinnerSlot').innerHTML=list.map((o,i)=>`<option value="${i}">${safe(o.date)} · ${safe(o.normalizedTime)} · ${Math.max(1,Number(o.qtyPlanned||selectedPromo.winnersPerDraw||1))} GANHADOR(ES) PREVISTOS</option>`).join('');
      $('jpDistWinnerSave').disabled=!list.length;
      status(list.length?'':'ESTA PROMOÇÃO NÃO POSSUI SORTEIO VÁLIDO PARA CADASTRO.');
    }
    $('jpDistWinnerPromo').addEventListener('change',refreshSlots);
    $('jpDistWinnerClose').addEventListener('click',close);
    overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
    $('jpDistWinnerSave').addEventListener('click',async()=>{
      if(busy)return;
      const item=available[Number($('jpDistWinnerPromo').value)];if(!item)return;
      const p=item.p,occ=occurrenceList(p)[Number($('jpDistWinnerSlot').value)];if(!occ)return;
      const name=upperName($('jpDistWinnerName').value),phone=String($('jpDistWinnerPhone').value||'').trim();
      if(name.split(' ').filter(Boolean).length<2){status('INFORME NOME E SOBRENOME DO GANHADOR.');return;}
      if(!firebaseConnected||!firebaseServerLoaded){status('FIREBASE INDISPONÍVEL. A OPERAÇÃO NÃO FOI EXECUTADA.');return;}
      if(!winnerBankRef)initWinnerBank();
      if(!winnerBankRef){status('BANCO DE GANHADORES NÃO CONECTADO.');return;}
      const date=occ.date,time=occ.normalizedTime,keys=winnerPromoMapKeys(date,time),key=keys.find(k=>Array.isArray(p.resultWinnersByHour?.[k]))||keys[0];
      const old=Array.isArray(p.resultWinnersByHour?.[key])?p.resultWinnersByHour[key]:[];
      const capacity=Math.max(1,Number(occ.qtyPlanned||p.winnersPerDraw||p.qtyPerDraw||1));
      if(old.length>=capacity){status('LIMITE DE GANHADORES DESTE SORTEIO ATINGIDO.');return;}
      const sourceRef=promoWinnerSourceRef(p,date,time);
      const reg=promoWinnerNormalize({id:'PW_'+promoWinnerToken(sourceRef+'|'+name+'|'+Date.now()),name,fullName:name,phone,profileVersion:0},p);
      const operator=promptOperatorIdentity();
      if(!operator?.name){status('IDENTIFIQUE O OPERADOR PARA REGISTRAR O GANHADOR.');return;}
      busy=true;$('jpDistWinnerSave').disabled=true;status('CONFIRMANDO A GRAVAÇÃO NO FIREBASE...');
      try{
        const context={sourceRef,date,time,slot:time.replace(':','H').replace(/H00$/,'H'),
          program:String(p.program||p.programName||'PAINEL DE DISTRIBUIÇÃO').toUpperCase(),
          prize:String(p.prizeTitle||p.name||p.title||'PROMOÇÃO').toUpperCase()};
        const result=await promoWinnerStore({stateRef:winnerStateRootRef(),bankRef:winnerBankRef,promo:p,
          occurrenceKey:key,winners:[...old.map(w=>typeof w==='string'?{name:w}:w),reg],context,operator,
          monthKeys:[item.month,date.slice(0,7)],months:state.months,
          validateRemote:remote=>{if(remote.kind!=='promo')throw new Error('PROMOÇÃO ALTERADA. REABRA O CADASTRO.');}});
        const updated=Array.isArray(result.rows)?result.rows:Object.values(result.rows||{}).filter(Boolean);
        const persisted=updated.find(x=>x.id===p.id)?.resultWinnersByHour?.[key]||[];
        if(!persisted.some(w=>String(w.name||'').toUpperCase()===name))throw new Error('NOME NÃO CONFERIDO APÓS GRAVAR. NÃO REPITA: ACIONE OPERAÇÕES.');
        if(state.months[result.monthKey])state.months[result.monthKey].promos=updated;
        if(typeof renderDistribuicao==='function')renderDistribuicao();
        if(typeof toast==='function')toast('GANHADOR REGISTRADO NA PROMOÇÃO ORIGINAL.');
        busy=false;close();
      }catch(error){status('OPERAÇÃO NÃO CONFIRMADA: '+(error.message||error));}
      finally{busy=false;if($('jpDistWinnerSave'))$('jpDistWinnerSave').disabled=false;}
    });
    refreshSlots();$('jpDistWinnerName').focus();
  };
})(window);
