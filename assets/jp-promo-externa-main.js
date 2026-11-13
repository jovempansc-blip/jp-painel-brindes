/* Main panel Externa view; writes only after authenticated Firebase connection. */
(function(){'use strict';
 const C=window.JPExternalCore;
 const el=id=>document.getElementById(id);
 const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 let loading=false,opened='';
 // Main Workspace loads Firebase Database without the optional Auth SDK.
 // Create only non-personal Externa action metadata; never unlock winners.
 const db=()=>new window.JPExternalRTDB(window.firebase.database(),{
   auth:typeof window.firebase?.auth==='function'?window.firebase.auth():null,
   secureBankVerified:window.JP_EXT_SECURE_BANK_VERIFIED===true,
   allowNonPersonalActions:true,
   statePath:window.FIREBASE_ROOT_PATH||'jp-painel-brindes/state'});
 const operator=()=>{
   try{return promptOperatorIdentity().name||'';}catch(error){return window.prompt('IDENTIFICAÇÃO DO OPERADOR:')||'';}
 };
 function monthKey(){return el('monthInput')?.value||state.currentMonth;}
 function monthDists(){return C.entries(state.months?.[monthKey()]?.distributions).filter(d=>d?.id&&C.quotaUnits(d)>0);}
 function options(){const sel=el('jpExtDistribution');if(!sel)return;
   const current=sel.value;
   sel.innerHTML='<option value="">SELECIONE O PRÊMIO DA COTA EXTERNA</option>'+monthDists().map(d=>{
    const qty=C.remainingUnallocated(d),u=C.externalUnit(d)==='pair'?'PARES':'IND.';
    return `<option value="${esc(d.id)}">${esc(d.prize||d.title||d.show||'PRÊMIO')} · ${qty/C.multiplier(C.externalUnit(d))} ${u} LIVRES</option>`;
   }).join('');
   if([...sel.options].some(x=>x.value===current))sel.value=current;
 }
 function formatMs(v){const n=Number(v);return n?new Date(n).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'AGUARDANDO SINCRONIZAÇÃO';}
 function render(){if(!el('jpExtTable'))return;options();
   const all=C.flatten(state.months||{}).sort((a,b)=>String(b.startsOn||'').localeCompare(String(a.startsOn||'')));
   const table=el('jpExtTable');table.innerHTML=all.map(a=>{
    const label=a.deliveryUnit==='pair'?'PARES':'UNID.';
    return `<tr><td><strong>${esc(a.title)}</strong><small>${esc(a.startsOn)} A ${esc(a.endsOn)} · ${esc(a.status)}</small></td><td>${esc(a.prize)}</td><td>${a.quantity} ${label}</td><td>${a.consumed/C.multiplier(a.deliveryUnit)}</td><td><span class="jpExtCount">${a.remaining/C.multiplier(a.deliveryUnit)}</span></td><td><button type="button" class="jpExtButton" data-jp-ext-detail="${esc(a.id)}">VER GANHADORES</button></td></tr>`;
   }).join('')||'<tr><td colspan="6" class="jpExtEmpty">NENHUMA AÇÃO EXTERNA CADASTRADA.</td></tr>';
   const selected=all.find(a=>a.id===opened);
   const h=el('jpExtHistory');if(!h)return;
   h.hidden=!selected;
   if(selected){h.innerHTML=`<h3>${esc(selected.title)} · ${selected.winners.length} GANHADOR(ES)</h3><table><thead><tr><th>GANHADOR</th><th>QTD.</th><th>REGISTRADO EM</th><th>STATUS</th></tr></thead><tbody>${selected.winners.map(w=>`<tr><td>${esc(w.name)}</td><td>${w.quantity} ${w.deliveryUnit==='pair'?'PAR':'IND.'}</td><td>${esc(formatMs(w.registeredAtMs))}</td><td>${esc(w.status)}</td></tr>`).join('')}</tbody></table>`;}
 }
 async function submit(ev){ev.preventDefault();if(loading)return;
   const f=el('jpExtForm'),button=f.querySelector('button[type="submit"]'),distributionId=el('jpExtDistribution').value;
   if(!distributionId)return alert('SELECIONE O PRÊMIO VINCULADO.');
   const name='PAINEL PRINCIPAL · EXTERNA';
   const payload={title:el('jpExtTitle').value,startsOn:el('jpExtStart').value,endsOn:el('jpExtEnd').value,
     quantity:el('jpExtQuantity').value,distributionId,month:monthKey()};
   loading=true;button.disabled=true;button.textContent='SALVANDO NO FIREBASE...';
   try{
     const store=db();
     const action=await store.createAction(payload,name);
     // The main Workspace's month listener may be asynchronous; reread the
     // confirmed distribution before rendering the table for the operator.
     const latest=await store.month(payload.month);
     if(state.months?.[payload.month]&&Array.isArray(latest.distributions)){
       state.months[payload.month].distributions=latest.distributions;
     }
     if(!action?.id)throw Error('AÇÃO SALVA, MAS IDENTIFICADOR NÃO CONFIRMADO. ATUALIZE A LISTA.');
     f.reset();render();alert('AÇÃO EXTERNA SALVA E CONFERIDA NO FIREBASE.');
   }
   catch(err){alert('AÇÃO NÃO CONFIRMADA. '+err.message);}
   finally{loading=false;button.disabled=false;button.textContent='SALVAR AÇÃO EXTERNA';}
 }
 function init(){el('jpExtForm')?.addEventListener('submit',submit);
   el('jpExtTable')?.addEventListener('click',e=>{const b=e.target.closest('[data-jp-ext-detail]');if(!b)return;opened=b.dataset.jpExtDetail;render();});
   el('monthInput')?.addEventListener('change',()=>setTimeout(render,150));
   el('jpExtOpenStudio')?.addEventListener('click',()=>window.open('promo_externa.html','_blank'));
   el('jpExtOpenReception')?.addEventListener('click',()=>window.open('recepcao_externa.html','_blank'));
   render();
 }
 window.JPExternalMain={render};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
