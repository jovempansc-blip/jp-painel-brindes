/* JP Workspace — Recepção: integração da promoção externa.
 * Fluxo desabilitado até regras privadas do Banco Central serem homologadas.
 * Quando autorizado: autenticação, listeners em tempo real, conciliação e baixa idempotente.
 */
(function(global){
  'use strict';
  const C=global.JPExternalCore,DB=global.JPExternalRTDB;
  const host=document.getElementById('jpExternalReceptionRows');
  const count=document.getElementById('jpExternalReceptionCount');
  const section=document.getElementById('jpExternalReceptionSection');
  if(!host||!C||!DB)return;
  const setVisible=()=>{if(section)section.hidden=!!global.JPReceptionPassport&&global.JPReceptionPassport.tab!=='externa';};
  const safe=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const stamp=x=>Number(x)?new Date(Number(x)).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'AGUARDANDO SERVIDOR';
  let months={},people={},engine=null,auth=null,busy=false,unsubMonths=null,bankRef=null;
  const pilot=global.JP_BOARD_PILOT_SYNTHETIC===true||global.JP_EXT_PILOT_MODE===true;
  const secure=pilot||global.JP_EXT_SECURE_BANK_VERIFIED===true;
  function message(msg){
    host.textContent=msg;if(count)count.textContent='0 A RETIRAR';
    if(global.JPReceptionPassport?.tab==='externa'){
      const badge=document.getElementById('receptionCampaignCount');if(badge)badge.textContent='0 A RETIRAR';
    }
    setVisible();
  }
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
  const prettyPhone=value=>{
    const n=String(value||'').replace(/\D/g,'');
    if(n.length===11)return '('+n.slice(0,2)+') '+n.slice(2,7)+'-'+n.slice(7);
    if(n.length===10)return '('+n.slice(0,2)+') '+n.slice(2,6)+'-'+n.slice(6);
    return String(value||'');
  };
  function render(){
    const pending=allPending(),query=String(document.getElementById('searchFilter')?.value||'').toUpperCase().trim();
    const titleCount=pending.length+' A RETIRAR';
    if(count)count.textContent=titleCount;
    if(global.JPReceptionPassport?.tab==='externa'){
      const badge=document.getElementById('receptionCampaignCount');
      if(badge)badge.textContent=titleCount;
    }
    const selected=pending.filter(w=>{
      const person=people['EXTERNA_'+w.id];
      return !query||[w.action,w.prize,person?.name,person?.phone,person?.companion?.name,
        person?.companion?.phone,w.id].join(' ').toUpperCase().includes(query);
    });
    setVisible();
    if(!selected.length){
      host.innerHTML='<div class="jpRcpEmpty">'+
        (query?'NENHUM GANHADOR ENCONTRADO NESTA BUSCA.':'NENHUMA RETIRADA EXTERNA PENDENTE.')+
        '</div>';
      return;
    }
    const groups=new Map();
    selected.forEach(w=>{
      const key=[w.month,w.actionId,w.action].join('|');
      if(!groups.has(key))groups.set(key,{action:w.action,prize:w.prize,rows:[]});
      groups.get(key).rows.push(w);
    });
    const personLine=(role,name,phone,cpf)=>'<div class="jpExtCompactPersonLine">'+
      '<span class="jpExtCompactRole">'+safe(role)+'</span>'+
      '<strong class="jpExtCompactName">'+safe(name||'IDENTIFICAÇÃO PENDENTE')+'</strong>'+
      (phone?'<span class="jpExtCompactContact">TEL: '+safe(prettyPhone(phone))+'</span>':'<span class="jpExtCompactContact">SEM TELEFONE</span>')+
      '<span class="jpExtCompactCpf">CPF: '+(cpf?'CADASTRADO':'NÃO INFORMADO')+'</span>'+
      '</div>';
    host.innerHTML=[...groups.values()].map(g=>
      '<section class="jpExtCompactGroup" aria-label="'+safe(g.action)+'">'+
        '<div class="jpExtCompactGroupHeading"><strong>'+safe(g.action)+'</strong>'+
          '<small>'+safe(g.prize)+'</small><span>'+g.rows.length+' RETIRADA'+(g.rows.length===1?'':'S')+'</span></div>'+
        '<div class="jpExtCompactList" role="list">'+g.rows.map(w=>{
          const record=people['EXTERNA_'+w.id],verified=w.bankStatus==='CONFIRMADO'&&!!record;
          const pair=w.unit==='pair';
          const status=verified?'AGUARDANDO RETIRADA':'PENDENTE DE CONCILIAÇÃO';
          const qty=Number(w.quantity)||1;
          return '<div class="jpExtCompactRow" role="listitem" data-ext-winner="'+safe(w.id)+'">'+
            '<div class="jpExtCompactPeople">'+
              personLine('TITULAR',record?.name,record?.phone,record?.cpf)+
              (pair?personLine('ACOMPANHANTE',record?.companion?.name,record?.companion?.phone,record?.companion?.cpf):'')+
            '</div>'+
            '<div class="jpExtCompactState"><strong>'+qty+' '+(pair?'PAR'+(qty===1?'':'ES'):'UNIDADE'+(qty===1?'':'S'))+'</strong>'+
              '<span class="'+(verified?'':'jpExtCompactPending')+'">'+safe(status)+'</span>'+
              '<small>'+safe(stamp(w.registeredAtMs))+'</small></div>'+
            (verified?'<button type="button" class="pickupBtn jpExtCompactAction" data-ext-pickup="'+safe(w.id)+'"'+(busy?' disabled':'')+'>CONFIRMAR RETIRADA</button>':
              '<button type="button" class="pickupBtn jpExtCompactAction" data-ext-sync="'+safe(w.id)+'"'+(busy?' disabled':'')+'>CONCILIAR BANCO</button>')+
          '</div>';
        }).join('')+'</div></section>'
    ).join('');
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
  global.JPExternalReceptionBridge={
    render,
    get pendingCount(){return allPending().length;}
  };
  host.addEventListener('click',operation);
  document.getElementById('searchFilter')?.addEventListener('input',render);
  if(!secure){
    // Segurança continua bloqueada; comunicação interna não aparece na Recepção.
    message('');
    return;
  }
  if(!global.firebase?.apps?.length){
    message('FIREBASE DA RECEPÇÃO NÃO ESTÁ CONECTADO.');
    return;
  }
  try{
    const app=global.firebase.app();
    auth=pilot?null:global.firebase.auth(app);
    const db=global.firebase.database(app);
    const activate=user=>{
      cleanup();
      if(!user&&!pilot){
        host.innerHTML='<div class="receptionCampaignEmpty">AUTENTICAÇÃO OBRIGATÓRIA PARA VER GANHADORES EXTERNOS. <button class="pickupBtn" type="button" data-ext-login>ENTRAR COM GOOGLE</button></div>';
        return;
      }
      engine=new DB(db,{auth,secureBankVerified:!pilot,pilotMode:pilot});
      unsubMonths=engine.onMonths(data=>{months=data||{};render();},
        err=>message('NÃO FOI POSSÍVEL LER AS PROMOÇÕES EXTERNAS: '+err.message));
      bankRef=db.ref('jp-painel-brindes/winnerBank/records');
      bankRef.on('value',snapshot=>{people=snapshot.val()||{};render();},
        err=>{cleanup();message('BANCO DE GANHADORES NÃO AUTORIZADO: '+err.message);});
    };
    if(pilot)activate(null);
    else auth.onAuthStateChanged(activate,err=>message('FALHA DE AUTENTICAÇÃO: '+err.message));
  }catch(error){message('INTEGRAÇÃO DA RECEPÇÃO INDISPONÍVEL: '+error.message);}
})(window);
