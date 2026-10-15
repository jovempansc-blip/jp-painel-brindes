/* JP WORKSPACE AV58.1.19 — PROGRAMACAO MANUAL — sem gravação fora da ação SALVAR */
(function(){
  'use strict';
  const el=id=>document.getElementById(id);
  const clean=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const rows=v=>Array.isArray(v)?v.filter(Boolean):Object.values(v||{}).filter(Boolean);
  const cloneJSON=v=>JSON.parse(JSON.stringify(v));
  const iso=()=>typeof todayISO==='function'?todayISO():new Date().toISOString().slice(0,10);
  const okDate=v=>/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(v||'');
  const shortSlot=v=>String(v||'').replace('H',':').replace(/:$/,'').padStart(2,'0');
  const slot=v=>typeof normalizeSlot==='function'?normalizeSlot(v):v;
  const qty=v=>Math.max(0,Number(v)||0);
  const liveItem=i=>i&&i.channel==='RÁDIO'&&!['CANCELADO','CANCELADA'].includes(String(i.status||'').toUpperCase());
  const locked=i=>!!(i&&(['REALIZADO','NO AR'].includes(String(i.status||'').toUpperCase())||i.resultAt||i.winnerName||(i.winnerNames||[]).length||i.resultName||i.deliveredAt||i.sourceType==='promo-result'||i.date<iso()||(i.date===iso()&&slotOrder(i.slot)<(new Date().getHours()+new Date().getMinutes()/60))));
  let mode='grade',date=iso(),station='JP1017',draft=null,busy=false,pending=null;
  let prizeQuery='',pautaQuery='',manualTab='prizes';
  function countryDate(d){return d.split('-').reverse().join('/');}
  function officialSlots(dateKey,stationKey){
    const set=new Set(),w=new Date(`${dateKey}T12:00:00`).getDay();
    (typeof programSchedules==='function'?programSchedules():[]).filter(p=>sameStation(p.station||'JP1017',stationKey)&&dayValuesFromRule(scheduleDays(p)).includes(w)).forEach(p=>{
      const first=Math.ceil(scheduleStartMinutes(p)/60)*60,stop=scheduleEndMinutes(p);
      for(let min=first;min<stop&&min<1440;min+=60){set.add(`${String(Math.floor(min/60)).padStart(2,'0')}H`);}
      const start=scheduleStartMinutes(p);if(start%60===30)set.add(`${String(Math.floor(start/60)).padStart(2,'0')}H30`);
    });
    const m=state.months?.[dateKey.slice(0,7)];
    rows(m?.items).filter(i=>i.date===dateKey&&itemStation(i)===stationKey&&liveItem(i)).forEach(i=>{if(programFromSchedule(dateKey,i.slot,stationKey))set.add(slot(i.slot));});
    return [...set].filter(s=>!!programFromSchedule(dateKey,s,stationKey)).sort((a,b)=>slotOrder(a)-slotOrder(b));
  }
  function promoPool(){
    const map=new Map();
    Object.values(state.months||{}).forEach(m=>rows(m?.promos).forEach(p=>{
      if(!p?.id)return;const old=map.get(p.id);if(!old||String(p.updatedAt||'')>String(old.updatedAt||''))map.set(p.id,p);
    }));
    return [...map.values()].filter(p=>{
      if(!p||p.opecArchived||p.opecForceEnded||p.opecPaused||p.opecPublicationStatus==='draft')return false;
      const status=String(p.status||'').toUpperCase();if(['CANCELADO','CANCELADA'].includes(status))return false;
      const kind=String(p.kind||p.promoKind||p.type||'').toLowerCase();if(!['pauta','promo','promoção','promocao'].includes(kind))return false;
      if(!sameStation(p.station||'JP1017',station))return false;
      const start=p.startDate||p.drawDate||'',end=p.endDate||p.drawDate||start;
      return (!start||date>=start)&&(!end||date<=end);
    }).sort((a,b)=>String(a.name||a.title).localeCompare(String(b.name||b.title),'pt-BR'));
  }
  function prizes(){
    const monthKey=date.slice(0,7),candidate=new Map();
    Object.values(state.months||{}).forEach(m=>rows(m?.distributions).forEach(d=>{
      if(!d?.id)return;
      if(date<distStartDate(d)||date>distEndDate(d))return;
      if(!candidate.has(d.id)||d.snapshotMonth===monthKey)candidate.set(d.id,d);
    }));
    return [...candidate.values()].sort((a,b)=>String(distributionLabel(a)).localeCompare(String(distributionLabel(b)),'pt-BR'));
  }
  function sourceDayItems(){return rows(state.months?.[date.slice(0,7)]?.items).filter(i=>i.date===date&&itemStation(i)===station&&liveItem(i)).map(cloneJSON);}
  function manualSlots(p){return rows(p?.manualReadAssignments).filter(a=>a.date===date&&sameStation(a.station||p.station||'JP1017',station));}
  function pautaAlreadyRead(promoId,plannedSlot){
    const p=promoPool().find(p=>p.id===promoId);if(!p)return false;
    const hour=String(slot(plannedSlot)).match(/^\d{2}/)?.[0]||'';
    const match=log=>log?.date===date&&sameStation(log.station||p.station||'JP1017',station)&&String(slot(log.slot||log.scheduledHour||'')).startsWith(hour);
    return rows(p.readLog).some(match)||rows(p.missedLog).some(match);
  }

  function snapshot(){
    const originals=sourceDayItems();const originalsMap=new Map(originals.map(i=>[i.id,cloneJSON(i)]));
    const ps=promoPool();
    const pautas=ps.flatMap(p=>manualSlots(p).map(a=>({key:a.key||`${p.id}_${date}_${a.slot}_${station}`,promoId:p.id,slot:slot(a.slot),date,station,program:a.program||programFromSchedule(date,a.slot,station)})));
    return {date,station,items:originals,pautas,originalPautas:cloneJSON(pautas),originalsMap,promoBaseline:new Map(ps.map(p=>[p.id,JSON.stringify(p)])),originalItemJson:JSON.stringify(originals)};
  }
  function changeDate(v){
    if(!okDate(v))return;
    if(draft&&hasChanges()&&!confirm('EXISTEM ALTERAÇÕES NÃO SALVAS. DESCARTÁ-LAS?')){if(el('jpManualDate'))el('jpManualDate').value=date;return;}
    date=v;draft=snapshot();paint();
  }
  function hasChanges(){if(!draft)return false;return JSON.stringify(draft.items)!==draft.originalItemJson||JSON.stringify(draft.pautas)!==JSON.stringify(draft.originalPautas);}
  function currentPrizes(){return draft?.items||[];}
  function used(d){
    const month=date.slice(0,7);
    let count=0;
    const seenOther=new Set();Object.values(state.months||{}).forEach((m)=>rows(m?.items).forEach(i=>{
      if(i?.distributionId===d.id&&String(i.date||'').slice(0,7)===month&&i.date!==date&&liveItem(i)&&!seenOther.has(i.id)){seenOther.add(i.id);count+=qty(i.qty);}
    }));
    draft.items.filter(i=>i.distributionId===d.id&&liveItem(i)).forEach(i=>count+=qty(i.qty));
    return count;
  }
  function totalAvailable(d){
    // Quantidades do canal Rádio são o limite operacional; par/individual conservam a unidade de programação.
    return Math.max(0,qty(d.ar));
  }
  function balance(d){return totalAvailable(d)-used(d);}
  function validity(d){return `${countryDate(distStartDate(d))} — ${countryDate(distEndDate(d))}`;}
  function itemCards(s){
    const entries=draft.items.filter(i=>slot(i.slot)===s).sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
    const pautas=draft.pautas.filter(p=>slot(p.slot)===s);
    return [...entries.map(i=>{
      const d=prizes().find(d=>d.id===i.distributionId),title=i.title||i.prize||distributionLabel(d)||'PRÊMIO';
      return `<div class="jpManualEntry" data-card="${clean(i.id)}" draggable="${!locked(i)}" data-drag-type="item" data-drag-id="${clean(i.id)}"><span class="icon">♔</span><div><strong>${clean(title)}</strong><small>PRÊMIO · ${qty(i.qty)} ${qty(i.qty)===1?'UNIDADE':'UNIDADES'}${locked(i)?' · REALIZADO / BLOQUEADO':''}</small></div><div class="jpManualEntryActions"><button type="button" data-edit-qty="${clean(i.id)}" ${locked(i)?'disabled':''} aria-label="EDITAR QUANTIDADE">QTD</button><button type="button" data-remove-item="${clean(i.id)}" ${locked(i)?'disabled':''} aria-label="REMOVER PRÊMIO">×</button></div></div>`;
    }),...pautas.map(p=>{
      const promo=promoPool().find(x=>x.id===p.promoId);return `<div class="jpManualEntry pauta" data-card="${clean(p.key)}" draggable="${!pautaAlreadyRead(p.promoId,p.slot)}" data-drag-type="assigned-pauta" data-drag-id="${clean(p.key)}"><span class="icon">♧</span><div><strong>${clean(promo?.name||promo?.title||'PAUTA')}</strong><small>PAUTA PROMOCIONAL · LEITURA MANUAL</small></div><button type="button" data-remove-pauta="${clean(p.key)}" ${pautaAlreadyRead(p.promoId,p.slot)?'disabled':''} aria-label="REMOVER PAUTA">×</button></div>`;
    })].join('');
  }
  function renderPeriods(){
    const official=officialSlots(date,station),periods=[['manha','MANHÃ','☀','00H ÀS 12H'],['tarde','TARDE','☼','12H ÀS 18H'],['noite','NOITE','☾','18H ÀS 24H']];
    if(!official.length)return `<div class="jpManualEmpty">NÃO HÁ HORÁRIOS OFICIAIS CADASTRADOS PARA ESTA DATA E EMISSORA. CADASTRE-OS EM HORÁRIOS ANTES DE PROGRAMAR.</div>`;
    return periods.map(([key,label,glyph,r])=>{
      const all=official.filter(s=>periodKey(s)===key);if(!all.length)return '';
      return `<section class="jpManualPeriod"><div class="jpManualPeriodName"><span class="periodGlyph">${glyph}</span><b>${label}</b><small>${r}</small></div><div class="jpManualSlots">${all.map(s=>`<div class="jpManualSlot" data-slot="${clean(s)}"><strong class="jpManualSlotTime">${clean(s.replace('H',':').replace(/:$/,'H00').replace(/:(\d+)/,'H$1'))}</strong><div class="jpManualSlotBody">${itemCards(s)}<div class="jpManualDrop" data-target="${clean(s)}" tabindex="0" role="button" title="SOLTE UM PRÊMIO OU PAUTA AQUI" aria-label="ADICIONAR ITEM EM ${clean(s)}">+ &nbsp; ARRASTE UM PRÊMIO OU PAUTA AQUI</div></div></div>`).join('')}</div></section>`;
    }).join('');
  }
  function stockRows(){return prizes().filter(d=>String(distributionLabel(d)).toLowerCase().includes(prizeQuery.toLowerCase())).map(d=>{
    const available=balance(d),name=distributionLabel(d);
    return `<div class="jpManualStockRow ${available<=0||!state.months?.[date.slice(0,7)]?.distributions?.some(x=>x.id===d.id)?'disabled':''}" draggable="${available>0&&!!state.months?.[date.slice(0,7)]?.distributions?.some(x=>x.id===d.id)}" data-drag-type="prize" data-drag-id="${clean(d.id)}" role="button" tabindex="0" title="ARRASTE OU CLIQUE PARA ESCOLHER HORÁRIO"><span class="dragDots">⠿</span><div><strong>${clean(name)}</strong><small>${clean(validity(d))}</small></div><div class="counts"><span class="countTotal">${state.months?.[date.slice(0,7)]?.distributions?.some(x=>x.id===d.id)?'RÁDIO '+totalAvailable(d):'SEM COTA NO MÊS'}</span><span>PROG. ${used(d)}</span><b>SALDO ${available}</b></div></div>`;
  }).join('')||'<div class="jpManualEmpty">NENHUM PRÊMIO DISPONÍVEL NA VIGÊNCIA.</div>';}
  function pautaRows(){return promoPool().filter(p=>String(p.name||p.title).toLowerCase().includes(pautaQuery.toLowerCase())).map(p=>{
    const count=draft.pautas.filter(a=>a.promoId===p.id).length;
    return `<div class="jpManualStockRow" draggable="true" data-drag-type="pauta" data-drag-id="${clean(p.id)}" role="button" tabindex="0" title="ARRASTE OU CLIQUE PARA ESCOLHER HORÁRIO"><span class="dragDots">⠿</span><div><strong>${clean(p.name||p.title||'PAUTA')}</strong><small>${clean(countryDate(p.startDate||date))} — ${clean(countryDate(p.endDate||date))}</small></div><div class="counts"><span>${count} NESTE DIA</span><b>${p.promoReadMethod==='manual'?'MANUAL':'REFORÇO'}</b></div></div>`;
  }).join('')||'<div class="jpManualEmpty">SEM PAUTAS DENTRO DA VIGÊNCIA.</div>';}
  function renderSidebar(){
    const showPrizes=manualTab!=='pautas';
    const prizeCount=prizes().length,pautaCount=promoPool().length;
    const searchId=showPrizes?'jpPrizeSearch':'jpPautaSearch';
    const searchValue=showPrizes?prizeQuery:pautaQuery;
    const searchPlaceholder=showPrizes?'BUSCAR PRÊMIO...':'BUSCAR PAUTA...';
    const stockId=showPrizes?'jpPrizeStock':'jpPautaStock';
    const content=showPrizes?stockRows():pautaRows();
    return `<aside class="jpManualPaper"><div class="jpManualStockHead"><strong>ITENS DISPONÍVEIS</strong><span>ARRASTE PARA A ESQUERDA ↖</span></div><div class="jpManualTabs" role="tablist" aria-label="TIPO DE ITEM"><button type="button" class="${showPrizes?'active':''}" data-manual-tab="prizes" role="tab" aria-selected="${showPrizes?'true':'false'}">♔ PRÊMIOS (${prizeCount})</button><button type="button" class="${showPrizes?'':'active'}" data-manual-tab="pautas" role="tab" aria-selected="${showPrizes?'false':'true'}">♧ PAUTAS (${pautaCount})</button></div><section class="jpManualStockGroup singleTab"><div class="jpManualGroupTitle ${showPrizes?'':'pautas'}"><strong>${showPrizes?'♔ &nbsp; PRÊMIOS DENTRO DA VIGÊNCIA':'♧ &nbsp; PAUTAS PROMOCIONAIS'}</strong><small>${showPrizes?`${prizeCount} CADASTRADOS`:`${pautaCount} EM VIGÊNCIA`}</small></div><input class="jpManualSearch" id="${searchId}" placeholder="${searchPlaceholder}" value="${clean(searchValue)}" aria-label="${searchPlaceholder}"><div id="${stockId}">${content}</div></section><div class="jpManualStockFooter">Arraste um item para o horário oficial. Os saldos mudam nesta prévia; a alteração só chega aos outros painéis depois de salvar no Firebase. Itens realizados não podem ser removidos nem movidos.</div></aside>`;
  }
  function paint(){
    if(mode!=='manual'||!draft||!el('programManualMount'))return;
    const oldScroll=el('programManualMount')?.scrollTop||0;
    const total= draft.items.length+draft.pautas.length,dirty=hasChanges();
    el('programManualMount').innerHTML=`<div class="jpManualShell"><section class="jpManualPaper"><header class="jpManualTop"><div class="jpManualDate"><strong>${clean(countryDate(date))}</strong><span>${clean(dayName(date))}</span></div><div class="jpManualControls"><label class="visuallyHidden" for="jpManualStation">EMISSORA</label><select id="jpManualStation" aria-label="EMISSORA"><option value="JP1017" ${station==='JP1017'?'selected':''}>JOVEM PAN 101,7</option><option value="JPNEWS983" ${station==='JPNEWS983'?'selected':''}>JPNEWS 98,3</option></select><label class="visuallyHidden" for="jpManualDate">DATA</label><input id="jpManualDate" type="date" value="${date}"><button type="button" class="jpManualBtn" id="jpManualReset">DESCARTAR</button><button type="button" class="jpManualBtn primary" id="jpManualSave" ${(!dirty||busy)?'disabled':''}>${busy?'SALVANDO...':'SALVAR PROGRAMAÇÃO'}</button></div></header><div class="jpManualSummary"><span>PROGRAMAÇÃO MANUAL · ${clean(stationLabel(station))}</span><span><b>${total}</b> ITENS NESTE DIA ${dirty?' · ALTERAÇÕES NÃO SALVAS':''}</span></div>${renderPeriods()}</section>${renderSidebar()}</div>`;
    el('programManualMount').scrollTop=oldScroll;
  }
  function reject(msg){window.alert(msg);return false;}
  function add(type,idValue,to){
    if(!officialSlots(date,station).includes(to))return reject('ESSE HORÁRIO NÃO PERTENCE À GRADE OFICIAL.');
    if(date<iso())return reject('NÃO É PERMITIDO INSERIR PROGRAMAÇÃO EM DATA PASSADA.');
    if(date===iso()&&slotOrder(to)<(new Date().getHours()+new Date().getMinutes()/60))return reject('NÃO É PERMITIDO INSERIR PROGRAMAÇÃO EM HORÁRIO QUE JÁ PASSOU.');
    if(type==='prize'){
      const d=prizes().find(d=>d.id===idValue);if(!d||balance(d)<1||!state.months?.[date.slice(0,7)]?.distributions?.some(x=>x.id===idValue))return reject('PRÊMIO SEM SALDO OU SEM COTA CONFIGURADA NESTE MÊS.');
      pending={type,idValue,to};showQtyDialog(d);return true;
    }
    if(type==='pauta'){
      const p=promoPool().find(p=>p.id===idValue);if(!p)return false;
      if(draft.pautas.some(a=>a.promoId===idValue&&slot(a.slot)===to))return reject('ESTA PAUTA JÁ ESTÁ NESTE HORÁRIO.');
      draft.pautas.push({key:`MAN_${idValue}_${date}_${to}_${station}`,promoId:idValue,date,slot:to,station,program:programFromSchedule(date,to,station)});
      paint();return true;
    }
    if(type==='item'){
      const item=draft.items.find(i=>i.id===idValue);if(!item||locked(item))return reject('ITEM REALIZADO OU BLOQUEADO NÃO PODE SER MOVIDO.');
      item.slot=to;item.program=programFromSchedule(date,to,station);item.updatedAt=new Date().toISOString();item.manualOverride=true;paint();return true;
    }
    if(type==='assigned-pauta'){
      const assignment=draft.pautas.find(p=>p.key===idValue);if(!assignment)return false; if(pautaAlreadyRead(assignment.promoId,assignment.slot))return reject('PAUTA JÁ LIDA OU JUSTIFICADA. ALTERAÇÃO BLOQUEADA PARA PRESERVAR O HISTÓRICO.');
      if(draft.pautas.some(a=>a.key!==idValue&&a.promoId===assignment.promoId&&slot(a.slot)===to))return reject('ESTA PAUTA JÁ ESTÁ NESTE HORÁRIO.');
      assignment.slot=to;assignment.key=`MAN_${assignment.promoId}_${date}_${to}_${station}`;assignment.program=programFromSchedule(date,to,station);paint();return true;
    }
    return false;
  }
  function showQtyDialog(d){
    const dlg=el('jpManualQtyDialog');if(!dlg)return;
    el('jpManualQtyTitle').textContent=`PROGRAMAR · ${distributionLabel(d)}`;
    el('jpManualQtyHint').textContent=`HORÁRIO ${pending.to} · SALDO ${balance(d)} ${distributionDeliveryUnit(d)==='pair'?'PARES':'UNIDADES'} NO CANAL RÁDIO`;
    el('jpManualQtyInput').max=String(balance(d));el('jpManualQtyInput').value='1';dlg.hidden=false;el('jpManualQtyInput').focus();
  }
  function closeQty(){el('jpManualQtyDialog').hidden=true;pending=null;}
  function confirmQty(){
    if(!pending)return;
    const d=prizes().find(x=>x.id===pending.idValue),amount=Number(el('jpManualQtyInput').value),max=d?balance(d):0;
    if(!Number.isSafeInteger(amount)||amount<1||amount>max)return reject(`INFORME UMA QUANTIDADE ENTRE 1 E ${max}.`);
    const stamp=new Date().toISOString();
    draft.items.push({id:`BRMAN_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,9)}`,date,day:dayName(date),week:weekLabel(date),slot:pending.to,station,program:programFromSchedule(date,pending.to,station),distributionId:d.id,prize:d.prize||distributionLabel(d),title:d.title||distributionLabel(d),description:d.description||'',qty:amount,channel:'RÁDIO',status:'PENDENTE',sourceType:'manual',manualOverride:true,manualCreated:true,createdAt:stamp,updatedAt:stamp});
    closeQty();paint();
  }
  function onEvents(){
    const host=el('programManualMount');if(!host)return;
    host.addEventListener('change',e=>{
      if(e.target.id==='jpManualDate')changeDate(e.target.value);
      if(e.target.id==='jpManualStation'){
        if(hasChanges()&&!confirm('DESCARTAR ALTERAÇÕES NÃO SALVAS?')){e.target.value=station;return;}
        station=e.target.value;draft=snapshot();paint();
      }
    });
    host.addEventListener('input',e=>{
      if(e.target.id==='jpPrizeSearch'){prizeQuery=e.target.value;el('jpPrizeStock').innerHTML=stockRows();}
      if(e.target.id==='jpPautaSearch'){pautaQuery=e.target.value;el('jpPautaStock').innerHTML=pautaRows();}
    });
    host.addEventListener('dragstart',e=>{
      const source=e.target.closest('[data-drag-type]');if(!source||source.classList.contains('disabled')||source.draggable===false){e.preventDefault();return;}
      e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',JSON.stringify({type:source.dataset.dragType,id:source.dataset.dragId}));
    });
    host.addEventListener('dragover',e=>{const target=e.target.closest('[data-target]');if(!target)return;e.preventDefault();e.dataTransfer.dropEffect='move';target.classList.add('dragOver');});
    host.addEventListener('dragleave',e=>{const target=e.target.closest('[data-target]');if(target&&!target.contains(e.relatedTarget))target.classList.remove('dragOver');});
    host.addEventListener('drop',e=>{const target=e.target.closest('[data-target]');if(!target)return;e.preventDefault();target.classList.remove('dragOver');try{const data=JSON.parse(e.dataTransfer.getData('text/plain'));add(data.type,data.id,target.dataset.target);}catch(err){console.warn('ITEM INVÁLIDO PARA ARRASTE',err);}});
    host.addEventListener('click',e=>{
      if(e.target.closest('#jpManualSave')){save();return;}
      const tabBtn=e.target.closest('[data-manual-tab]');if(tabBtn){manualTab=tabBtn.dataset.manualTab==='pautas'?'pautas':'prizes';paint();return;}
      if(e.target.closest('#jpManualReset')){if(!hasChanges()||confirm('DESCARTAR ALTERAÇÕES NÃO SALVAS?')){draft=snapshot();paint();}return;}
      const editQty=e.target.closest('[data-edit-qty]');
      if(editQty){
        const i=draft.items.find(i=>i.id===editQty.dataset.editQty);if(!i||locked(i))return;
        const d=prizes().find(d=>d.id===i.distributionId);if(!d)return reject('DISTRIBUIÇÃO DO PRÊMIO NÃO LOCALIZADA.');
        const max=balance(d)+qty(i.qty),answer=prompt(`EDITAR QUANTIDADE NO HORÁRIO ${i.slot}.\nDISPONÍVEL PARA ESTE ITEM: ${max}`,String(i.qty));
        if(answer===null)return;const next=Number(answer);
        if(!Number.isSafeInteger(next)||next<1||next>max)return reject(`USE UMA QUANTIDADE ENTRE 1 E ${max}.`);
        i.qty=next;i.updatedAt=new Date().toISOString();i.manualOverride=true;paint();return;
      }
      const remove=e.target.closest('[data-remove-item]');if(remove){const item=draft.items.find(i=>i.id===remove.dataset.removeItem);if(item&&!locked(item)&&confirm('REMOVER ESTA PROGRAMAÇÃO?')){draft.items=draft.items.filter(i=>i.id!==item.id);paint();}return;}
      const removeP=e.target.closest('[data-remove-pauta]');if(removeP){const target=draft.pautas.find(p=>p.key===removeP.dataset.removePauta);if(!target||pautaAlreadyRead(target.promoId,target.slot))return reject('LEITURA REALIZADA: USE O HISTÓRICO PARA CONFERIR.');draft.pautas=draft.pautas.filter(p=>p.key!==removeP.dataset.removePauta);paint();return;}
      const src=e.target.closest('.jpManualStockRow');if(src){if(src.classList.contains('disabled'))return;const choices=officialSlots(date,station),answer=prompt(`EM QUAL HORÁRIO PROGRAMAR?\n${choices.join(' · ')}`,choices[0]||'');if(answer!==null){const chosen=slot(answer);add(src.dataset.dragType,src.dataset.dragId,chosen);}return;}
    });
  }
  function alertCollision(baseItems,basePautas,remote,desiredPautas){
    const oldItems=rows(remote?.items).filter(i=>i.date===date&&itemStation(i)===station&&liveItem(i));
    if(JSON.stringify(oldItems)!==JSON.stringify(baseItems))return 'OUTRA SESSÃO ALTEROU OS PRÊMIOS DESTE DIA. RECARREGUE O RASCUNHO.';
    const touchedIds=new Set([...basePautas,...desiredPautas].map(a=>a.promoId));
    for(const id of touchedIds){
      const p=rows(remote?.promos).find(p=>p.id===id),current=promoPool().find(p=>p.id===id);
      if(!p||!current)return 'PAUTA ALTERADA OU NÃO ENCONTRADA NA BASE OFICIAL.';
      const wanted=basePautas.filter(a=>a.promoId===id),actual=rows(p.manualReadAssignments).filter(a=>a.date===date&&sameStation(a.station||p.station||'JP1017',station)).map(a=>({key:a.key||`${id}_${date}_${a.slot}_${station}`,promoId:id,slot:slot(a.slot),date,station,program:a.program||programFromSchedule(date,a.slot,station)}));
      if(JSON.stringify(actual)!==JSON.stringify(wanted))return 'OUTRA SESSÃO MODIFICOU AS PAUTAS DESSE DIA.';
      if(date<(p.startDate||date)||date>(p.endDate||date)||['CANCELADO','CANCELADA'].includes(String(p.status||'').toUpperCase())||p.opecArchived||p.opecForceEnded)return 'VIGÊNCIA OU STATUS DA PAUTA ALTERADOS EM OUTRA SESSÃO.';
      const baseline=JSON.parse(draft.promoBaseline.get(id)||'{}');
      if(JSON.stringify(rows(p.readLog))!==JSON.stringify(rows(baseline.readLog))||JSON.stringify(rows(p.missedLog))!==JSON.stringify(rows(baseline.missedLog)))return 'O HISTÓRICO DE LEITURAS FOI ALTERADO POR OUTRA SESSÃO. ATUALIZE ANTES DE SALVAR.';
    }
    return '';
  }
  async function save(){
    if(busy||!draft||!hasChanges())return;
    if(typeof firebaseStateRootRef!=='function'||!firebaseConnected||!firebaseServerLoaded||firebasePendingSave||!firebaseReady)return reject('O FIREBASE AINDA NÃO ESTÁ CONECTADO OU HÁ OUTRA GRAVAÇÃO EM ANDAMENTO. NADA FOI ALTERADO.');
    if(!confirm(`SALVAR A PROGRAMAÇÃO MANUAL DE ${countryDate(date)}?\n\nOS PAINÉIS CONECTADOS RECEBERÃO AS ALTERAÇÕES PELO FIREBASE. CONFIRA QUANTIDADES E LEITURAS.`))return;
    busy=true;paint();
    const targetMonth=date.slice(0,7),baseItems=cloneJSON([...draft.originalsMap.values()]),basePautas=cloneJSON(draft.originalPautas),desiredItems=cloneJSON(draft.items),desiredPautas=cloneJSON(draft.pautas),basePrizes=prizes().filter(d=>desiredItems.some(i=>i.distributionId===d.id)).map(d=>({id:d.id,total:totalAvailable(d),starts:distStartDate(d),ends:distEndDate(d)}));
    let failure='';
    try{
      const root=firebaseStateRootRef();if(!root)throw new Error('RAIZ OFICIAL DO FIREBASE INDISPONÍVEL.');
      const tx=await root.child('months').child(targetMonth).transaction(month=>{
        if(!month||!month.items||!month.distributions){failure='MÊS NÃO ENCONTRADO NA BASE OFICIAL. NÃO FOI ALTERADO.';return;}
        failure=alertCollision(baseItems,basePautas,month,desiredPautas);if(failure)return;
        const storedItems=rows(month.items),storedDist=rows(month.distributions),storedPromos=rows(month.promos);
        const currentPrizeSet=new Map(storedDist.map(d=>[d.id,d]));
        for(const d of basePrizes){const target=currentPrizeSet.get(d.id);if(!target){failure='PRÊMIO SEM SNAPSHOT NESTE MÊS. CONFIRA A DISTRIBUIÇÃO GERAL.';return;}}
        const itemIds=new Set(baseItems.map(i=>i.id));
        const revised=[...storedItems.filter(i=>!itemIds.has(i.id)),...desiredItems];
        for(const d of basePrizes){
          const remote=currentPrizeSet.get(d.id);if(date<distStartDate(remote)||date>distEndDate(remote)){failure=`VIGÊNCIA ALTERADA: ${distributionLabel(remote)}`;return;}
          const spent=revised.filter(i=>i.distributionId===d.id&&String(i.date||'').slice(0,7)===targetMonth&&liveItem(i)).reduce((sum,i)=>sum+qty(i.qty),0);
          if(spent>qty(remote.ar)){failure=`SALDO INSUFICIENTE: ${distributionLabel(remote)}. TOTAL PROGRAMADO ${spent} / COTA RÁDIO ${qty(remote.ar)}`;return;}
        }
        const audit={id:`MP_${date}_${station}_${Date.now()}`,date,station,at:new Date().toISOString(),source:'PROG_MANUAL',before:baseItems.map(i=>({id:i.id,slot:i.slot,qty:i.qty,distributionId:i.distributionId})),after:desiredItems.map(i=>({id:i.id,slot:i.slot,qty:i.qty,distributionId:i.distributionId})),beforePautas:basePautas.map(a=>({id:a.promoId,slot:a.slot})),afterPautas:desiredPautas.map(a=>({id:a.promoId,slot:a.slot}))};
        month.manualProgramHistory=[...rows(month.manualProgramHistory),audit].slice(-300);
        month.items=revised;
        const touched=new Set([...basePautas,...desiredPautas].map(p=>p.promoId));
        month.promos=storedPromos.map(p=>{
          if(!touched.has(p.id))return p;
          const other=rows(p.manualReadAssignments).filter(a=>a.date!==date||!sameStation(a.station||p.station||'JP1017',station));
          const mine=desiredPautas.filter(a=>a.promoId===p.id).map(a=>({key:a.key,date:a.date,station:a.station,slot:a.slot,program:a.program,source:'PROG_MANUAL'}));
          return {...p,manualReadAssignments:[...other,...mine],updatedAt:new Date().toISOString()};
        });
        return month;
      },undefined,false);
      if(!tx?.committed)throw new Error(failure||'ALTERAÇÃO NÃO CONFIRMADA. O BANCO PERMANECE PRESERVADO.');
      if(tx.snapshot?.val())state.months[targetMonth]=tx.snapshot.val();
      draft=snapshot();if(typeof renderProgramacao==='function')renderProgramacao();paint();
      if(typeof toast==='function')toast('PROGRAMAÇÃO MANUAL CONFIRMADA PELO FIREBASE.');
    }catch(err){console.error('PROG MANUAL · SAVE',err);window.alert('A PROGRAMAÇÃO NÃO FOI SALVA.\n\n'+(failure||err.message||err));}
    finally{busy=false;paint();}
  }
  function enter(){
    const grade=el('programGradeContainer'),mount=el('programManualMount');if(!mount||!grade)return;
    const visible=mode==='manual';grade.hidden=visible;mount.hidden=!visible;
    document.querySelectorAll('[data-jp-prog-mode]').forEach(btn=>{const active=btn.dataset.jpProgMode===mode;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',active?'true':'false');});
    if(visible){if(!draft)draft=snapshot();paint();}
  }
  document.addEventListener('click',e=>{const btn=e.target.closest('[data-jp-prog-mode]');if(!btn)return;const next=btn.dataset.jpProgMode;if(next===mode)return;mode=next;enter();});
  const initializeManual=()=>{onEvents();el('jpManualQtyCancel')?.addEventListener('click',closeQty);el('jpManualQtyConfirm')?.addEventListener('click',confirmQty);el('jpManualQtyInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();confirmQty();}});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initializeManual,{once:true});else initializeManual();
  window.JPManual={enter,refreshIfOpen(){if(mode==='manual'&&el('view-programacao')?.classList.contains('active')){if(draft&&!hasChanges())draft=snapshot();paint();}}, get mode(){return mode;},test:{officialSlots,qty}};
})();
