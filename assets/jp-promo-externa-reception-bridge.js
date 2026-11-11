/* JP Workspace — Recepção: integração da promoção externa.
 * Fluxo desabilitado até regras privadas do Banco Central serem homologadas.
 * Quando autorizado: autenticação, listeners em tempo real, conciliação e baixa idempotente.
 */
(function(global){
  'use strict';
  const C=global.JPExternalCore,DB=global.JPExternalRTDB;
  const host=document.getElementById('jpExternalReceptionRows');
  const count=document.getElementById('jpExternalReceptionCount');
  if(!host||!C||!DB)return;
  const safe=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const stamp=x=>Number(x)?new Date(Number(x)).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'AGUARDANDO SERVIDOR';
  let months={},people={},engine=null,auth=null,busy=false,unsubMonths=null,bankRef=null;
  const secure=global.JP_EXT_SECURE_BANK_VERIFIED===true;
  function message(msg){host.textContent=msg;if(count)count.textContent='0 A RETIRAR';}
  function cleanup(){
    if(unsubMonths){unsubMonths();unsubMonths=null;}
    if(bankRef){bankRef.off('value');bankRef=null;}
    months={};people={};engine=null;
  }
  function allPending(){
    const rows=[];
    C.flatten(months).forEach(a=>a.winners.forEach(w=>{
      if(w.status==='AGUARDANDO_RETIRADA')rows.push({
        ...w,action:a.title,prize:a.prize,month:a.distributionMonth,
        unit:w.deliveryUnit||a.deliveryUnit
      });
    }));
    return rows.sort((a,b)=>Number(b.registeredAtMs||0)-Number(a.registeredAtMs||0));
  }
  function render(){
    const pending=allPending(),query=String(document.getElementById('searchFilter')?.value||'').toUpperCase().trim();
    if(count)count.textContent=pending.length+' A RETIRAR';
    const selected=pending.filter(w=>{
      const person=people['EXTERNA_'+w.id];
      return !query||[w.action,w.prize,person?.name,w.id].join(' ').toUpperCase().includes(query);
    });
    host.innerHTML=selected.length?selected.map(w=>{
      const record=people['EXTERNA_'+w.id],verified=w.bankStatus==='CONFIRMADO'&&!!record;
      const text=verified?'AGUARDANDO RETIRADA':'PENDENTE DE CONCILIAÇÃO';
      return '<div class="receptionCampaign" data-ext-winner="'+safe(w.id)+'" style="padding:12px;margin:8px 0;display:grid;grid-template-columns:minmax(130px,1fr) minmax(130px,1fr) minmax(145px,1fr) auto;gap:12px;align-items:center">'
       +'<div><strong>'+safe(w.action)+'</strong><small>'+safe(w.prize)+'</small></div>'
       +'<div><strong>'+safe(record?.name||'IDENTIFICAÇÃO PENDENTE')+'</strong><small>'+safe(stamp(w.registeredAtMs))+'</small></div>'
       +'<div>'+safe(w.quantity)+' '+(w.unit==='pair'?'PAR(ES)':'UNIDADE(S)')+'<small>'+safe(text)+'</small></div>'
       +(verified?'<button type="button" class="pickupBtn" data-ext-pickup="'+safe(w.id)+'"'+(busy?' disabled':'')+'>CONFIRMAR RETIRADA</button>'
          :'<button type="button" class="pickupBtn" data-ext-sync="'+safe(w.id)+'"'+(busy?' disabled':'')+'>CONCILIAR BANCO</button>')
       +'</div>';
    }).join(''):'<div class="receptionCampaignEmpty">NENHUMA PROMOÇÃO EXTERNA PENDENTE PARA ESTA BUSCA.</div>';
  }
  async function operation(ev){
    const login=ev.target.closest('[data-ext-login]');
    if(login){
      try{await auth.signInWithPopup(new global.firebase.auth.GoogleAuthProvider());}
      catch(err){message('AUTENTICAÇÃO NÃO CONFIRMADA: '+err.message);}
      return;
    }
    const button=ev.target.closest('[data-ext-pickup],[data-ext-sync]');
    if(!button||busy||!engine)return;
    const winnerId=button.dataset.extPickup||button.dataset.extSync;
    const w=allPending().find(row=>row.id===winnerId);
    if(!w)return;
    const operator=global.prompt('IDENTIFICAÇÃO DO ATENDENTE DA RECEPÇÃO:','');
    if(!operator?.trim())return;
    const payload={month:w.month,distributionId:w.distributionId,actionId:w.actionId,winnerId:w.id};
    if(button.dataset.extPickup&&!global.confirm('CONFIRMAR ENTREGA DE '+String(people['EXTERNA_'+w.id]?.name||'GANHADOR')+'?'))return;
    busy=true;button.disabled=true;button.textContent='CONFIRMANDO...';
    try{
      if(button.dataset.extSync){
        await engine.retryBankSync(payload);
        global.alert('CADASTRO CONCILIADO COM O BANCO CENTRAL.');
      }else{
        const result=await engine.pickup(payload,operator.trim());
        global.alert(result.bankPickupPending
          ?'RETIRADA REGISTRADA, MAS A CONFIRMAÇÃO DO BANCO CENTRAL ESTÁ PENDENTE.'
          :'RETIRADA CONFIRMADA PELO FIREBASE EM '+stamp(result.deliveredAtMs));
      }
    }catch(error){global.alert('OPERAÇÃO NÃO CONFIRMADA: '+String(error.message||error));}
    finally{busy=false;render();}
  }
  host.addEventListener('click',operation);
  document.getElementById('searchFilter')?.addEventListener('input',render);
  if(!secure){
    message('PROMOÇÃO EXTERNA BLOQUEADA PARA PROTEÇÃO DOS DADOS PESSOAIS. A09 DEVE HOMOLOGAR AS REGRAS DO BANCO CENTRAL NO FIREBASE ANTES DA LIBERAÇÃO.');
    return;
  }
  if(!global.firebase?.apps?.length){
    message('FIREBASE DA RECEPÇÃO NÃO ESTÁ CONECTADO.');
    return;
  }
  try{
    const app=global.firebase.app();
    auth=global.firebase.auth(app);
    const db=global.firebase.database(app);
    auth.onAuthStateChanged(user=>{
      cleanup();
      if(!user){
        host.innerHTML='<div class="receptionCampaignEmpty">AUTENTICAÇÃO OBRIGATÓRIA PARA VER GANHADORES EXTERNOS. <button class="pickupBtn" type="button" data-ext-login>ENTRAR COM GOOGLE</button></div>';
        return;
      }
      engine=new DB(db,{auth,secureBankVerified:true});
      unsubMonths=engine.onMonths(data=>{months=data||{};render();},
        err=>message('NÃO FOI POSSÍVEL LER AS PROMOÇÕES EXTERNAS: '+err.message));
      bankRef=db.ref('jp-painel-brindes/winnerBank/records');
      bankRef.on('value',snapshot=>{people=snapshot.val()||{};render();},
        err=>{cleanup();message('BANCO DE GANHADORES NÃO AUTORIZADO: '+err.message);});
    },err=>message('FALHA DE AUTENTICAÇÃO: '+err.message));
  }catch(error){message('INTEGRAÇÃO DA RECEPÇÃO INDISPONÍVEL: '+error.message);}
})(window);
