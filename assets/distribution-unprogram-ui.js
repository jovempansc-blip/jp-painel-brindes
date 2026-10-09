/* AV58.1.10 — desprogramação e vínculos por prêmio. Carregado após o painel. */
let distributionUnprogramContext=null;
let distributionUnprogramBusy=false;
let distributionProgramMenuContext=null;
const distributionUnprogramEvents=new Map();
window.deferDistributionUnprogramEvent=(kind,key,value,removed=false)=>{
  if(distributionUnprogramBusy)distributionUnprogramEvents.set(`${kind}:${key}`,{kind,key,value:clone(value),removed});
};
function drainDistributionUnprogramEvents(){
  if(firebasePendingSave)return;
  const events=[...distributionUnprogramEvents.values()];distributionUnprogramEvents.clear();
  events.forEach(e=>e.kind==='month'?applyFirebaseMonthEvent(e.key,e.value,e.removed):applyFirebaseRootEvent(e.key,e.value));
}
window.isDistributionUnprogramBusy=()=>distributionUnprogramBusy;
function distributionUnprogramOptions(){
  const ctx=distributionUnprogramContext;
  return {distributionIds:ctx.ids,month:ctx.month,mode:$('distUnprogramMode').value,day:$('distUnprogramDay').value,start:$('distUnprogramStart').value,end:$('distUnprogramEnd').value};
}
function openDistributionUnprogram(distId,options={}){
  if(distributionUnprogramBusy)return;
  if(!window.JPDistributionUnprogram){toast('NÃO FOI POSSÍVEL CARREGAR A DESPROGRAMAÇÃO. RECARREGUE O PAINEL.');return;}
  const record=distributionVisualRecord(distId)||distributionCampaignCopies(distId)[0]?.d;
  if(!record){toast('PRÊMIO NÃO LOCALIZADO.');return;}
  const ids=new Set(distributionVisualIds(record)),group=distributionVisualGroupKey(record);
  Object.values(state.months||{}).forEach(month=>firebaseList(month.distributions).forEach(d=>{if(distributionVisualGroupKey(d)===group)distributionVisualIds(d).forEach(id=>ids.add(id));}));
  distributionUnprogramContext={distId,ids:[...ids],month:state.currentMonth,label:distributionLabel(record)};
  $('distUnprogramTitle').textContent=distributionLabel(record);
  $('distUnprogramMode').value=options.day?'day':'month';
  $('distUnprogramDay').value=options.day||todayISO();
  $('distUnprogramStart').value=monthStartDate(state.currentMonth);
  $('distUnprogramEnd').value=monthEndDate(state.currentMonth);
  $('distUnprogramFeedback').textContent=options.blocked?'EXCLUSÃO BLOQUEADA: CONFIRA OS VÍNCULOS ABAIXO.':'';
  $('distUnprogramLinks').hidden=!options.showLinks;
  closeDistributionProgramMenu();
  openDrawer('distUnprogramDrawer');renderDistributionUnprogram();
}
function renderDistributionUnprogram(){
  if(!distributionUnprogramContext||distributionUnprogramBusy||!$('distUnprogramDrawer').classList.contains('open'))return;
  const mode=$('distUnprogramMode').value;
  $('distUnprogramDayField').hidden=mode!=='day';$('distUnprogramRangeFields').hidden=mode!=='range';
  $('distUnprogramScopeNote').textContent=mode==='all'?'TODOS OS MESES DESTE PRÊMIO':mode==='month'?`SOMENTE ${labelMonth(distributionUnprogramContext.month)}`:'DATAS INCLUSIVAS';
  const button=$('distUnprogramApply');let plan;
  try{plan=JPDistributionUnprogram.plan(state,distributionUnprogramOptions());}
  catch(error){$('distUnprogramSummary').textContent=error.message;$('distUnprogramDates').innerHTML='';$('distUnprogramLinkList').innerHTML='';button.disabled=true;return;}
  $('distUnprogramSummary').innerHTML=`<strong>${plan.removable.length} HORÁRIO(S) PARA REMOVER</strong><span>${plan.protected.length} REGISTRO(S) PRESERVADO(S) · ${plan.promos.length} VÍNCULO(S) COM PROMOÇÕES</span>`;
  const grouped=new Map();plan.removable.forEach(row=>grouped.set(row.item.date,(grouped.get(row.item.date)||0)+1));
  $('distUnprogramDates').innerHTML=grouped.size?[...grouped].map(([date,count])=>`<span>${esc(formatBR(date))}<b>${count}</b></span>`).join(''):'<span>NENHUM HORÁRIO REMOVÍVEL NESTE PERÍODO.</span>';
  $('distUnprogramLinkList').innerHTML=plan.rows.map(({monthKey,item,reason})=>`<div class="distUnprogramLink ${reason?'preserved':''}"><div><strong>${esc(formatBR(item.date)||'SEM DATA')} · ${esc(item.slot||'SEM HORÁRIO')}</strong><span>${esc(normalizeChannel(item.channel))} · ${esc(stationLabel(itemStation(item)))} · ${esc(item.program||'SEM PROGRAMA')}</span><small>${esc(reason||'SERÁ DESPROGRAMADO')} · CADASTRADO EM ${esc(labelMonth(monthKey))}</small></div><button class="btn small" type="button" data-unprogram-view-item="${esc(item.id||'')}" data-record-month="${esc(monthKey)}">VER CADASTRO</button></div>`).join('')+plan.promos.map(({monthKey,p})=>`<div class="distUnprogramLink preserved"><div><strong>${esc(p.name||p.title||'PROMOÇÃO')}</strong><span>${esc(promoStatusData(p).label)} · ${esc(labelMonth(monthKey))}</span><small>VÍNCULO DO CADASTRO · ALTERE OU ENCERRE A PROMOÇÃO SE NECESSÁRIO</small></div><button class="btn small" type="button" data-unprogram-view-promo="${esc(p.id)}" data-record-month="${esc(monthKey)}">ABRIR</button></div>`).join('');
  if(!plan.rows.length&&!plan.promos.length)$('distUnprogramLinkList').innerHTML='<div class="empty">NENHUM VÍNCULO NESTE PERÍODO.</div>';
  button.disabled=!plan.removable.length;button.textContent=`DESPROGRAMAR ${plan.removable.length} HORÁRIO(S)`;
  $('distUnprogramToggleLinks').textContent=$('distUnprogramLinks').hidden?'VER VÍNCULOS':'RECOLHER VÍNCULOS';
}
async function applyDistributionUnprogram(){
  if(distributionUnprogramBusy||!distributionUnprogramContext)return;
  let preview;try{preview=JPDistributionUnprogram.plan(state,distributionUnprogramOptions());}catch(error){toast(error.message);return;}
  if(!preview.removable.length)return;
  const ctx={...distributionUnprogramContext},all=$('distUnprogramMode').value==='all';
  const dates=preview.dates.map(formatBR).join(', ');
  if(!confirm(`DESPROGRAMAR ${preview.removable.length} HORÁRIO(S) DE ${ctx.label}?\n\nDATAS: ${dates}\n${all?'TODOS OS MESES DO PRÊMIO SERÃO INCLUÍDOS.':'SOMENTE O PERÍODO SELECIONADO.'}\n\nSORTEIOS REALIZADOS, GANHADORES E PROMOÇÕES SERÃO PRESERVADOS.`))return;
  const button=$('distUnprogramApply'),feedback=$('distUnprogramFeedback');
  distributionUnprogramBusy=true;button.disabled=true;button.textContent='DESPROGRAMANDO...';feedback.textContent='AGUARDANDO CONFIRMAÇÃO DO FIREBASE...';
  const confirmed=[],skipped=[];let failure=null,secondaryFailure=false,ownsPending=false;
  try{
    if(navigator.onLine===false||!firebaseConnected||!firebaseServerLoaded)throw new Error('FIREBASE INDISPONÍVEL. NENHUM HORÁRIO FOI ALTERADO.');
    if(firebasePendingSave)await flushFirebaseNow('ANTES DA DESPROGRAMAÇÃO');
    const root=firebaseStateRootRef();if(!root)throw new Error('FIREBASE INDISPONÍVEL.');
    const operator=currentOperatorIdentity(true),operation={id:id('UNP'),createdAt:new Date().toISOString(),operatorName:operator.name,operatorSector:operator.sector,distributionIds:ctx.ids,label:ctx.label};
    const groups=new Map();preview.removable.forEach(row=>{const list=groups.get(row.monthKey)||[];list.push(row);groups.set(row.monthKey,list);});
    clearTimeout(firebaseSaveTimer);firebasePendingSave=true;ownsPending=true;
    for(const [monthKey,candidates] of groups){
      try{
      const tx=await root.child('months').child(monthKey).transaction(current=>{
        if(!current)return;
        return JPDistributionUnprogram.applyMonth(current,candidates,operation).month;
      },undefined,false);
      if(!tx?.committed)throw new Error(`NÃO FOI POSSÍVEL CONFIRMAR ${labelMonth(monthKey)}.`);
      const saved=tx.snapshot.val(),receipt=saved.unprogramHistory?.[operation.id]||{};
      (receipt.removed||[]).forEach(item=>confirmed.push({monthKey,item}));skipped.push(...(receipt.skipped||[]));
      state.months[monthKey]=firebaseNormalizeMonthValue(monthKey,saved);
      firebaseBaselineState.months[monthKey]=clone(state.months[monthKey]);
      }catch(error){failure=error;break;}
    }
    if(confirmed.length){
      const trash=confirmed.map(({monthKey,item},index)=>({id:`TR_${operation.id}_${index}`,type:'ITEM',label:item.prize||item.title||ctx.label,payload:clone(item),monthKey,sourceId:item.id,createdAt:operation.createdAt,createdAtLabel:new Date(operation.createdAt).toLocaleString('pt-BR'),origin:'DESPROGRAMAÇÃO POR PRÊMIO',operatorName:operator.name,operatorSector:operator.sector}));
      const log={id:`LOG_${operation.id}`,action:'DESPROGRAMAÇÃO POR PRÊMIO',targetId:ctx.distId,origin:'PAINEL PRINCIPAL',operatorName:operator.name,operatorSector:operator.sector,createdAt:operation.createdAt,note:`${confirmed.length} HORÁRIOS REMOVIDOS · ${preview.dates.join(', ')} · ${skipped.length} ALTERADOS / PRESERVADOS`};
      const writes=await Promise.allSettled([
        root.child('trash').transaction(current=>mergeAuditRows(current,trash),undefined,false),
        root.child('auditLog').transaction(current=>mergeAuditRows(current,[log]),undefined,false),
        root.update({savedAt:new Date().toISOString(),updatedAt:window.firebase.database.ServerValue.TIMESTAMP,source:'DESPROGRAMACAO_DISTRIBUICAO'})
      ]);
      writes.slice(0,2).forEach((result,index)=>{
        if(result.status==='fulfilled'&&result.value?.committed){const key=index===0?'trash':'auditLog';state[key]=firebaseList(result.value.snapshot.val());firebaseBaselineState[key]=clone(state[key]);}
        else secondaryFailure=true;
      });
    }
  }catch(error){failure=error;console.warn('DESPROGRAMAÇÃO',error);}
  finally{if(ownsPending)firebasePendingSave=false;distributionUnprogramBusy=false;drainDistributionUnprogramEvents();render();renderDistributionUnprogram();}
  const message=`${confirmed.length} HORÁRIO(S) DESPROGRAMADO(S)${skipped.length?` · ${skipped.length} ALTERADO(S) / PRESERVADO(S)`:''}`;
  if(failure){feedback.textContent=`${message}. ${failure.message} CONFIRA OS VÍNCULOS RESTANTES. AS CÓPIAS DOS REMOVIDOS ESTÃO NO HISTÓRICO DA COMPETÊNCIA.`;toast(confirmed.length?'DESPROGRAMAÇÃO PARCIAL · CONFIRA OS VÍNCULOS RESTANTES.':failure.message);return;}
  if(secondaryFailure){feedback.textContent=`${message}. A LIXEIRA/AUDITORIA NÃO FOI TOTALMENTE ATUALIZADA. AS CÓPIAS ESTÃO PRESERVADAS NO HISTÓRICO DA COMPETÊNCIA.`;return;}
  if(skipped.length||!confirmed.length){feedback.textContent=`${message}. OS DADOS MUDARAM DESDE A PRÉVIA; CONFIRA A LISTA ATUAL.`;return;}
  closeDrawer('distUnprogramDrawer');toast(`${message} · CONFIRMADO NO FIREBASE.`);
}
function closeDistributionProgramMenu(){const menu=$('distProgramContextMenu');if(menu)menu.hidden=true;distributionProgramMenuContext=null;}
function openDistributionProgramMenu(event,card){
  event.preventDefault();event.stopPropagation();
  const menu=$('distProgramContextMenu'),itemId=card.dataset.programItemId,found=programItemRecord(itemId);
  if(!found?.item.distributionId)return;
  distributionProgramMenuContext={distId:found.item.distributionId,itemId,day:found.item.date};
  menu.innerHTML='<button role="menuitem" type="button" data-dist-context-action="unprogram">✕ DESPROGRAMAR</button><button role="menuitem" type="button" data-dist-context-action="links">VER VÍNCULOS</button>'+(card.querySelector('.programDragHandle.isMovable')?'<button role="menuitem" type="button" data-dist-context-action="time">ALTERAR HORÁRIO</button>':'');
  menu.hidden=false;menu.style.left=`${Math.min(event.clientX,Math.max(8,window.innerWidth-230))}px`;menu.style.top=`${Math.min(event.clientY,Math.max(8,window.innerHeight-145))}px`;menu.querySelector('button')?.focus();
}
document.addEventListener('click',event=>{
  const action=event.target.closest('[data-dist-context-action]');
  if(action&&distributionProgramMenuContext){const context={...distributionProgramMenuContext};closeDistributionProgramMenu();if(action.dataset.distContextAction==='time')openProgramExactTimeDialog(context.itemId);else openDistributionUnprogram(context.distId,{day:context.day,showLinks:action.dataset.distContextAction==='links'});return;}
  const unprogram=event.target.closest('[data-unprogram-dist]'),links=event.target.closest('[data-dist-links]');
  if(unprogram||links){event.preventDefault();event.stopPropagation();openDistributionUnprogram((unprogram||links).dataset[unprogram?'unprogramDist':'distLinks'],{showLinks:!!links});return;}
  const item=event.target.closest('[data-unprogram-view-item]'),promo=event.target.closest('[data-unprogram-view-promo]');
  if(item||promo){if(distributionUnprogramBusy)return;const target=item||promo;closeDrawer('distUnprogramDrawer');state.currentMonth=target.dataset.recordMonth;render();if(item)editItem(item.dataset.unprogramViewItem);else editPromo(promo.dataset.unprogramViewPromo);return;}
  if(!event.target.closest('#distProgramContextMenu'))closeDistributionProgramMenu();
},true);
document.addEventListener('keydown',event=>{
  const menu=$('distProgramContextMenu');if(!menu||menu.hidden)return;
  if(event.key==='Escape'){const itemId=distributionProgramMenuContext?.itemId;closeDistributionProgramMenu();document.querySelector(`[data-program-item-id="${CSS.escape(itemId||'')}"] .programActionMenu summary`)?.focus();}
  if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();const buttons=[...menu.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);buttons[(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}
});
window.addEventListener('resize',closeDistributionProgramMenu);document.addEventListener('scroll',closeDistributionProgramMenu,true);
['distUnprogramMode','distUnprogramDay','distUnprogramStart','distUnprogramEnd'].forEach(key=>$(key).addEventListener('change',()=>{$('distUnprogramFeedback').textContent='';renderDistributionUnprogram();}));
$('distUnprogramToggleLinks').addEventListener('click',()=>{$('distUnprogramLinks').hidden=!$('distUnprogramLinks').hidden;renderDistributionUnprogram();});
$('distUnprogramApply').addEventListener('click',applyDistributionUnprogram);
window.renderDistributionUnprogram=renderDistributionUnprogram;
