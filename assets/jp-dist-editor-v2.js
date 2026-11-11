/* JP Workspace — editor reorganizado; preserva nós e IDs da ficha original. */
(function(){
  "use strict";
  let installed=false;
  function byId(id){return document.getElementById(id);}
  function status(mode,message){
    const el=byId("distEditorSaveStatus");
    if(!el)return;
    el.dataset.status=mode;
    el.textContent=message;
    const global=byId("distEditorTableStatus");
    if(global && (mode==="saved" || mode==="error")){
      global.hidden=false;
      global.dataset.status=mode;
      global.textContent=message;
    }
  }
  function makeSection(shell,label,id,expanded){
    const details=document.createElement("details");
    details.className="distEditorSection";
    details.id=id;
    details.open=!!expanded;
    const summary=document.createElement("summary");
    summary.textContent=label;
    const body=document.createElement("div");
    body.className="distEditorSectionBody";
    details.append(summary,body);
    shell.append(details);
    return body;
  }
  function mainSection(shell,label,detail,extraClass){
    const section=document.createElement("section");
    section.className="distEditorSection "+extraClass;
    const head=document.createElement("div");
    head.className="distEditorSectionTitle";
    const strong=document.createElement("strong");
    strong.textContent=label;
    const info=document.createElement("small");
    info.textContent=detail||"";
    head.append(strong,info);
    const body=document.createElement("div");
    body.className="distEditorSectionBody";
    section.append(head,body);
    shell.append(section);
    return body;
  }
  function move(id,dest){
    const el=byId(id);
    if(!el)throw new Error("CAMPO AUSENTE NA FICHA: "+id);
    const field=el.closest(".field")||el.closest("section.distEventVersions");
    if(!field)throw new Error("AGRUPAMENTO DE CAMPO AUSENTE: "+id);
    dest.append(field);
    return field;
  }
  function install(){
    if(installed)return true;
    const form=byId("distForm");
    const original=form?.querySelector(":scope > .formGrid");
    if(!form||!original)return false;
    const shell=document.createElement("div");
    shell.id="distEditorLayout";
    const overview=document.createElement("div");
    overview.className="distEditorOverview";
    overview.innerHTML='<div class="distEditorTop"><div><strong id="distEditorPrizeHeading">DISTRIBUIÇÃO</strong><span id="distEditorPeriod">VIGÊNCIA DA CAMPANHA</span></div><button class="btn small" type="button" data-editor-section="distReceivingDetails">+ RECEBER INGRESSOS</button></div>'
      +'<div class="distEditorKpis">'
      +'<div class="distEditorKpi"><small>ESTOQUE FÍSICO</small><b id="distEditorPhysical">0</b><em>campanha</em></div>'
      +'<div class="distEditorKpi"><small>COTA DO MÊS</small><b id="distEditorQuota">0</b><em>unidades</em></div>'
      +'<div class="distEditorKpi"><small>DESTINADO</small><b id="distEditorAssigned">0</b><em>unidades nos canais</em></div>'
      +'<div class="distEditorKpi free" id="distEditorFreeBox"><small>LIVRE NO MÊS</small><b id="distEditorFree">0</b><em>unidades sem destino</em></div>'
      +'</div>';
    shell.append(overview);
    const distribution=mainSection(shell,"DISTRIBUIÇÃO POR CANAL","PAR E INDIVIDUAL CONTINUAM INDEPENDENTES","distEditorPrimary");
    const radioButton=document.createElement("button");
    radioButton.type="button";
    radioButton.id="distEditorAllocateRadio";
    radioButton.className="btn small";
    radioButton.textContent="DESTINAR SALDO LIVRE AO RÁDIO";
    radioButton.title="Transforma as unidades livres em prêmios do canal Rádio. Não cria sorteios e exige Salvar e Conferir.";
    radioButton.addEventListener("click",allocateFreeToRadio);
    const actionRow=document.createElement("div");
    actionRow.className="field full distEditorRadioAction";
    actionRow.append(radioButton);
    const actionHelp=document.createElement("small");
    actionHelp.textContent="A DISPONIBILIDADE PARA GERAÇÃO AUTOMÁTICA OU MANUAL SÓ AUMENTA DEPOIS DE DESTINAR AS UNIDADES AO RÁDIO E SALVAR.";
    actionRow.append(actionHelp);
    const history=mainSection(shell,"HISTÓRICO DE ACRÉSCIMOS","ESTORNO AUDITÁVEL","distEditorHistory");
    const receiving=makeSection(shell,"RECEBIMENTO E AJUSTES DE ESTOQUE","distReceivingDetails",false);
    const identity=makeSection(shell,"DADOS DO PRÊMIO E PERÍODO","distIdentityDetails",false);
    const scheduling=makeSection(shell,"RODÍZIO E HORÁRIOS DE RÁDIO","distSchedulingDetails",false);
    const appearance=makeSection(shell,"FONTES, TAMANHOS E CORES","distAppearanceDetails",false);
    const event=makeSection(shell,"EVENTO COM DATAS INDEPENDENTES","distEventDetails",false);
    const metrics=makeSection(shell,"CONFERÊNCIA DETALHADA DOS SALDOS","distMetricsDetails",false);
    ["distDate","distShow"].forEach(id=>{const el=byId(id);if(el)form.insertBefore(el,original);});
    ["distPrizeType","distTicketDefaultUnit","distPairsPreview","distDestList"].forEach(id=>move(id,distribution));
    distribution.append(actionRow);
    move("distStockHistoryField",history);
    ["distTotal","distMasterStockField","distStockReceiveField","distStockAdjustmentField"].forEach(id=>move(id,receiving));
    ["distStartDate","distEndDate","distPrize","distTitle","distDescription"].forEach(id=>move(id,identity));
    ["distTitle","distDescription"].forEach(id=>{
      const field=byId(id)?.closest(".field");
      const editor=field?.querySelector(".textStyleEditor");
      if(editor){
        const wrapper=document.createElement("div");
        wrapper.className="field full";
        const label=document.createElement("label");
        label.textContent=id==="distTitle"?"ESTILO DO TÍTULO":"ESTILO DA DESCRIÇÃO";
        wrapper.append(label,editor);
        appearance.append(wrapper);
      }
    });
    move("distRotationHours",scheduling);
    move("distEventMode",event);
    const versions=byId("distEventVersions");
    if(versions)event.append(versions);
    move("distMonthlyStockOverview",metrics);
    move("distConversionSummary",metrics);
    shell.querySelectorAll(".ticketFormHint").forEach(hint=>{
      if(!hint.textContent.trim() || hint.closest(".distEditorHistory"))return;
      const button=document.createElement("button");
      button.type="button";
      button.className="distEditorInfo";
      button.setAttribute("aria-label","EXIBIR EXPLICAÇÃO DESTE CAMPO");
      button.setAttribute("aria-expanded","false");
      button.title="EXIBIR EXPLICAÇÃO";
      button.textContent="?";
      button.addEventListener("click",()=>{
        const show=hint.classList.toggle("distEditorHintOpen");
        button.setAttribute("aria-expanded",String(show));
      });
      hint.before(button);
    });
    form.insertBefore(shell,original);
    original.remove();
    const footer=form.querySelector(".formActions");
    if(footer){
      const text=document.createElement("div");
      text.id="distEditorSaveStatus";
      text.className="distEditorSaveStatus";
      text.setAttribute("role","status");
      text.setAttribute("aria-live","polite");
      footer.insertBefore(text,footer.firstChild);
      const submit=footer.querySelector('button[type="submit"]');
      if(submit)submit.textContent="SALVAR E CONFERIR";
    }
    shell.querySelectorAll("[data-editor-section]").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const details=byId(btn.dataset.editorSection);
        if(details){details.open=true;details.scrollIntoView({block:"nearest",behavior:"smooth"});}
      });
    });
    const pageHead=byId("view-distribuicao")?.querySelector(".panelHead");
    if(pageHead && !byId("distEditorTableStatus")){
      const indicator=document.createElement("div");
      indicator.id="distEditorTableStatus";
      indicator.setAttribute("role","status");
      indicator.setAttribute("aria-live","polite");
      indicator.hidden=true;
      pageHead.append(indicator);
    }
    // Uma alteração na ficha é rascunho até o retorno confirmado pelo servidor.
    ["input","change"].forEach(type=>form.addEventListener(type,event=>{
      if(!event.target.closest("#distEditorLayout"))return;
      status("pending","ALTERAÇÕES AINDA NÃO SALVAS. CLIQUE EM SALVAR E CONFERIR.");
      if(event.target.id==="distStockReceiveUnits")updateDistStockChangePreview(false);
      queueMicrotask(refresh);
    }));
    const list=byId("distDestList");
    if(list)list.addEventListener("click",()=>queueMicrotask(refresh));
    const receive=byId("distStockReceiveBtn");
    if(receive)receive.addEventListener("click",()=>queueMicrotask(()=>{
      status("pending","ACRÉSCIMO PREPARADO. INFORME A ORIGEM E CLIQUE EM SALVAR E CONFERIR.");
      refresh();
    }));
    installed=true;
    status("ready","FICHA PRONTA. NENHUMA ALTERAÇÃO SALVA NESTA SESSÃO.");
    return true;
  }
  function allocateFreeToRadio(){
    if(!install())return;
    // Inclui as unidades recebidas que ainda estão digitadas no formulário.
    if(typeof stageDistributionReceiptFromInput==='function'&&!stageDistributionReceiptFromInput())return;
    const existing=distDestRows().find(row=>row.dataset.key==='ar');
    const unit=normalizeReservationUnit(existing?.querySelector('.destUnit')?.value||
      (byId('distTicketDefaultUnit')?.value||'unit'));
    const factor=unit==='pair'?2:1;
    const assigned=distDestRows().reduce((sum,row)=>{
      const qty=Number(row.querySelector('.destQty')?.value)||0;
      return sum+(qty>0?destinationConsumed(qty,normalizeReservationUnit(row.querySelector('.destUnit')?.value||'unit'),true):0);
    },0);
    const available=formTotalUnitario()-assigned;
    const packages=Math.floor(available/factor);
    if(packages<1){
      alert('NÃO HÁ UNIDADES LIVRES SUFICIENTES PARA DESTINAR AO RÁDIO. REVISE A COTA DO MÊS E OS OUTROS CANAIS.');
      return;
    }
    const unitName=unit==='pair'?'PARES':'UNIDADES';
    if(!confirm('DESTINAR '+packages+' '+unitName+' ('+(packages*factor)+' UNIDADES FÍSICAS) AO RÁDIO?\n\nISSO NÃO GERA SORTEIOS E NÃO É SALVO ATÉ CLICAR EM SALVAR E CONFERIR.'))return;
    let row=existing;
    let previous=0;
    if(!row){
      addDistributionDestination('ar');
      row=distDestRows().find(item=>item.dataset.key==='ar');
    }else previous=Number(row.querySelector('.destQty')?.value)||0;
    if(!row)throw Error('DESTINO RÁDIO NÃO PÔDE SER LOCALIZADO.');
    row.querySelector('.destQty').value=String(previous+packages);
    row.querySelector('.destUnit').value=unit;
    updateDistDestinationSummary();
    updateDistStockChangePreview(false);
    refresh();
    status('pending','+'+packages+' '+unitName+' DESTINADOS AO RÁDIO. CLIQUE EM SALVAR E CONFERIR.');
  }
  function configure(distribution){
    if(!install())return;
    const existing=!!distribution?.id;
    byId("distIdentityDetails").open=!existing;
    byId("distReceivingDetails").open=!existing;
    byId("distSchedulingDetails").open=false;
    byId("distAppearanceDetails").open=false;
    byId("distEventDetails").open=!!distribution?.eventGroupId;
    byId("distMetricsDetails").open=false;
    status("ready",existing?"PRONTO PARA EDITAR. ALTERAÇÕES EXIGEM CONFIRMAÇÃO NO FIREBASE.":"NOVO PRÊMIO. PREENCHA OS DADOS E SALVE.");
    refresh();
  }
  function refresh(){
    if(!installed)return;
    const prize=(byId("distPrize")?.value||"").trim()||"NOVO PRÊMIO";
    byId("distEditorPrizeHeading").textContent=prize;
    const from=byId("distStartDate")?.value||"";
    const to=byId("distEndDate")?.value||"";
    byId("distEditorPeriod").textContent=from+" → "+to;
    const current=distributionById(byId("distId")?.value||"");
    let quota=Number(byId("distTotal")?.value)||0;
    let physical=current?Number(byId("distMasterTotal")?.value):quota;
    let valid=true;
    if(current){
      try{
        const rawPending=String(byId("distStockReceiveUnits")?.value??"").trim();
        const pending=rawPending?Number(rawPending):0;
        if(rawPending&&(!/^\d+$/.test(rawPending)||!Number.isSafeInteger(pending)||pending<1))
          throw Error("QUANTIDADE INVÁLIDA");
        const intendedMaster=Number(byId("distMasterTotal")?.value)+pending;
        const proposal=distributionStockUpdateProposal(current,
          byId("distTotal")?.value,intendedMaster,
          byId("distStockAdjustmentMode")?.value||"current");
        quota=proposal.monthTotal;
        physical=proposal.masterTotal;
      }catch(error){valid=false;}
    }
    const rows=Array.from(document.querySelectorAll("#distDestList [data-dest-row]"));
    const assigned=rows.reduce((total,row)=>{
      const input=row.querySelector(".destQty");
      const n=Number(input?.value);
      if(!Number.isFinite(n)||n<=0)return total;
      const mode=normalizeReservationUnit(row.querySelector(".destUnit")?.value||"unit");
      return total+destinationConsumed(n,mode,true);
    },0);
    const free=quota-assigned;
    byId("distEditorPhysical").textContent=String(Number.isFinite(physical)?physical:0);
    byId("distEditorQuota").textContent=String(quota);
    byId("distEditorAssigned").textContent=String(assigned);
    byId("distEditorFree").textContent=String(free);
    byId("distEditorFreeBox").classList.toggle("bad",free<0||!valid);
  }
  window.JPDistEditor={install,configure,refresh,status};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
})();

