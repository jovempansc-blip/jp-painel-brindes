/* JP BOARD ROOM | Rodapé do sorteio | versão candidata 23/11/2026
 * Módulo VISUAL: não grava, não lê diretamente o Firebase, não muda estoque,
 * não altera a validação de cadastro e não reprograma horários.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const upper = value => String(value ?? '').trim().toUpperCase();
  const clockSvg = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/></svg>`;
  const ticketSvg = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10 10 4l3.4 3.4a2 2 0 0 0 2.8 2.8L20 14l-6 6-3.4-3.4a2 2 0 0 0-2.8-2.8z" transform="rotate(10 12 12)"/><path d="m12 8 4 4"/></svg>`;

  function slotOf(item) {
    const raw = String(item?.slot || '').replace(/\s/g,'').toUpperCase();
    const match = raw.match(/^(\d{1,2})(?::|H)?(\d{2})?$/);
    if(!match) return null;
    const hour = Number(match[1]), minute = Number(match[2] ?? 0);
    if(hour > 23 || minute > 59) return null;
    return {hour,minute};
  }
  function resultTime(item) {
    const match = String(item?.date||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const slot = slotOf(item);
    if(!match || !slot) return NaN;
    const [year,month,day] = match.slice(1).map(Number);
    const date = new Date(year,month-1,day,slot.hour,slot.minute,0,0);
    if(date.getFullYear()!==year || date.getMonth()!==month-1 || date.getDate()!==day)return NaN;
    return date.getTime();
  }
  function isEligible(item,promo) {
    if(!item || !item.date || !item.slot || !Number.isFinite(resultTime(item)))return false;
    if(typeof studioConsultOtherDate==='function' && studioConsultOtherDate())return false;
    if(promo) {
      const isCampaign=typeof studioIsCampaign==='function' && studioIsCampaign(promo);
      const opened=typeof studioCampaignContext!=='undefined' && !!studioCampaignContext;
      return !!isCampaign && (opened || item.sourceType==='promo-result');
    }
    if(item.__virtual || item.sourceType==='promo-result')return false;
    if(!item.distributionId && !item.prize && !item.title)return false;
    if(item.channel && !['RÁDIO','RADIO'].includes(upper(item.channel)))return false;
    return !['CANCELADO','CANCELADA'].includes(upper(item.status));
  }
  function isComplete(item,promo) {
    if(promo) {
      if(typeof promoOccurrenceForItem !== 'function' || typeof promoWinnerList !== 'function')return false;
      const occ = promoOccurrenceForItem(promo,item);
      if(!occ)return false;
      const count=Math.max(1,Number(occ.qtyPlanned||promo.winnersPerDraw||promo.qtyPerDraw||1));
      return promoWinnerList(promo,item).length>=count;
    }
    const count=Math.max(1,Number(item.winnerCapacity||item.qty||1));
    const list=typeof existingWinnerNames==='function'?existingWinnerNames(item):String(item.winnerName||'').split(',').filter(Boolean);
    return list.length>=count;
  }
  function state(target,done,now=Date.now()) {
    if(done)return {text:'RESULTADO <strong>CONFIRMADO</strong>',css:'jpRaffleDone'};
    const delta=target-now;
    if(delta>0){
      const mins=Math.ceil(delta/60000);
      if(mins>90){const d=new Date(target);return {text:`RESULTADO ÀS <strong>${String(d.getHours()).padStart(2,'0')}H${String(d.getMinutes()).padStart(2,'0')}</strong>`,css:''};}
      return {text:`RESULTADO EM <strong>${String(mins).padStart(2,'0')} MIN</strong>`,css:mins<=5?'jpRaffleSoon':''};
    }
    if(delta>=-60000)return {text:'RESULTADO <strong>AGORA</strong>',css:'jpRaffleSoon'};
    return {text:'RESULTADO <strong>PENDENTE</strong>',css:'jpRaffleLate'};
  }
  const panel = $('pautaPanel');
  if(!panel)return;
  let activeTarget = null;
  let activeDone = false;
  let footer = null;
  function sync() {
    // Somente lê o item selecionado no Estúdio (fonte oficial da renderização).
    const item = typeof currentDisplayItem !== 'undefined' ? currentDisplayItem : null;
    const promo = typeof currentPromoForRead==='function' ? currentPromoForRead() : null;
    const host=panel.querySelector('.pautaBody > .titleBox');
    if(!host || !isEligible(item,promo)){footer=null;activeTarget=null;return;}
    const target=resultTime(item);
    let node=host.querySelector(':scope > .jpRaffleFooter');
    if(!node){
      node=document.createElement('div');
      node.className='jpRaffleFooter';
      const isHalf=slotOf(item).minute===30;
      const label=isHalf?'PRÊMIO DA MEIA HORA':'PRÊMIO DA HORA';
      node.innerHTML=`<span class="jpRaffleLeft">${ticketSvg}<span>${label}</span></span><span class="jpRaffleRight">${clockSvg}<span data-jp-raffle-result></span></span>`;
      host.classList.add('jpRaffleTitle');
      host.appendChild(node);
    }
    footer=node;
    activeTarget=target;
    activeDone=isComplete(item,promo);
    refresh();
  }
  function refresh(){
    if(!footer || !footer.isConnected || !Number.isFinite(activeTarget))return;
    const next=state(activeTarget,activeDone);
    const label=footer.querySelector('[data-jp-raffle-result]');
    if(label && label.innerHTML!==next.text)label.innerHTML=next.text;
    footer.classList.toggle('jpRaffleSoon',next.css==='jpRaffleSoon');
    footer.classList.toggle('jpRaffleLate',next.css==='jpRaffleLate');
    footer.classList.toggle('jpRaffleDone',next.css==='jpRaffleDone');
  }
  // O render() oficial substitui o conteúdo do painel; o observador reaplica
  // apenas o rodapé no novo cartão. Não altera os controles de navegação.
  const observer=new MutationObserver(()=>sync());
  observer.observe(panel,{childList:true,subtree:false});
  sync();
  setInterval(refresh,1000);
  // Inspeção determinística apenas para o QA isolado; não é API de operação.
  if(typeof window !== 'undefined' && window.__JP_RAFFLE_QA__ === true)
    window.__JP_RAFFLE_DEBUG__={slotOf,resultTime,state,sync};
})();
