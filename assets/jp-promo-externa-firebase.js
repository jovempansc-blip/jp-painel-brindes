/* AV58 — Promo Externa Firebase adapter. Auth required; writes are transaction-only. */
(function(global){
 'use strict';
 const C=global.JPExternalCore;
 if(!C)throw Error('JPExternalCore not loaded');
 function assert(ok,message){if(!ok)throw Error(message);}
 class ExternalRTDB {
   constructor(db,options={}){
     assert(db&&typeof db.ref==='function','FIREBASE DATABASE INDISPONÍVEL.');
     this.db=db;this.statePath=options.statePath||'jp-painel-brindes/state';this.bankPath=options.bankPath||'jp-painel-brindes/winnerBank';
     this.auth=options.auth||null;this.pilotMode=options.pilotMode===true;this.requireAuth=options.requireAuth!==false;this.secureBankVerified=options.secureBankVerified===true;
     // Allows ONLY an action without winners/PII from the already operating main panel.
     // All winner registration, pickup, cancellation and private bank actions retain checkAuth().
     this.allowNonPersonalActions=options.allowNonPersonalActions===true;
   }
   checkAuth(){
     if(this.pilotMode)return; // BOARD: synthetic-only pilot; never describe as a verified private bank.
     if(this.requireAuth)assert(this.auth?.currentUser?.uid,'AUTENTICAÇÃO FIREBASE OBRIGATÓRIA PARA GRAVAÇÃO.');
     assert(this.secureBankVerified,'ESCRITA BLOQUEADA: BANCO DE GANHADORES AINDA É LEGÍVEL SEM AUTENTICAÇÃO. A09 DEVE VALIDAR REGRAS SEGURAS NA HML ANTES DE ATIVAR ESTE MÓDULO.');
   }
   monthRef(m){assert(/^\d{4}-\d{2}$/.test(m),'COMPETÊNCIA INVÁLIDA.');return this.db.ref(this.statePath+'/months/'+m);}
   distRef(m){return this.monthRef(m).child('distributions');}
   async allMonths(){const snap=await this.db.ref(this.statePath+'/months').get();return snap.val()||{};}
   async month(m){const s=await this.monthRef(m).get();return s.val()||{};}
   async tx(month,distributionId,fn,options={}){
     if(!(options.nonPersonalAction===true&&this.allowNonPersonalActions))this.checkAuth();
     const ref=this.distRef(month);
     let error=null,changed=null;
     const result=await ref.transaction(current=>{
       try{const outcome=fn(current);changed=outcome;error=null;return outcome.rows||outcome;}
       catch(e){error=e;return;}
     },undefined,false);
     if(!result?.committed)throw error||Error('TRANSAÇÃO NÃO CONFIRMADA PELO FIREBASE. TENTE NOVAMENTE APÓS CONFERIR O CADASTRO.');
     const checked=(await ref.get()).val();
     assert(checked!==null,'GRAVAÇÃO NÃO CONFERIDA NO FIREBASE.');
     const dist=C.entries(checked).find(d=>d?.id===distributionId);
     assert(dist,'PRÊMIO NÃO ENCONTRADO APÓS A GRAVAÇÃO.');
     return {dist,rows:checked,changed};
   }
   serverTimestamp(){return global.firebase?.database?.ServerValue?.TIMESTAMP||Date.now();}
   async createAction(payload,operator){
     const actionId=payload.id||C.newId('EXTA');
     // The action contains scheduling/quota metadata only. No operator name is
     // published in the public RTDB tree; winner/phone/CPF operations remain locked.
     const safeOperator=this.allowNonPersonalActions?'PAINEL PRINCIPAL · EXTERNA':operator;
     const x=await this.tx(payload.month,payload.distributionId,rows=>C.createAction(rows,{...payload,id:actionId},{operator:safeOperator,serverTimestamp:this.serverTimestamp()}),
       {nonPersonalAction:true});
     assert(x.dist.externalActions?.[actionId],'AÇÃO NÃO CONFERIU APÓS SALVAR.');
     return x.dist.externalActions[actionId];
   }
   async registerWinner(payload,operator){
     this.checkAuth();
     const winnerId=payload.id||C.newId('EXTW');
     const bankRoot=this.db.ref(this.bankPath);
     const pendingRef=bankRoot.child('pendingExternal/EXTERNA_'+winnerId);
     const name=C.fullName(payload.name),phone=C.digits(payload.phone),cpf=C.cpfDigits(payload.cpf);
     const month=await this.month(payload.month);
     const distribution=C.entries(month?.distributions).find(d=>d?.id===payload.distributionId);
     const matchingAction=distribution?.externalActions?.[payload.actionId];
     assert(!!matchingAction,'AÇÃO EXTERNA NÃO ENCONTRADA.');
     const companion=C.companionDetails(payload.companion);
     assert(!companion||matchingAction.deliveryUnit==='pair',
       'ACOMPANHANTE É PERMITIDO APENAS EM PRÊMIOS ENTREGUES COMO PAR.');
     assert(!companion||companion.name!==name,'O NOME DO ACOMPANHANTE PRECISA SER DIFERENTE DO GANHADOR.');
     assert(C.cpfValid(payload.cpf),'CPF INFORMADO É INVÁLIDO. CONFIRA OS DÍGITOS.');
     assert(name.length>=5&&phone.length>=10,'NOME COMPLETO E TELEFONE COM DDD SÃO OBRIGATÓRIOS.');
     // Read protected winnerBank records to avoid repeated names/phones in same action.
     const all=await Promise.all([bankRoot.child('records').get(),bankRoot.child('pendingExternal').get()]);
     const already=[...C.entries(all[0].val()),...C.entries(all[1].val())].some(r=>
       r.actionId===payload.actionId&&r.status!=='CANCELADO'&&(C.fullName(r.name)===name||C.digits(r.phone)===phone));
     assert(!already,'OUVINTE JÁ CONSTA COMO GANHADOR DESTA AÇÃO.');
     // Secure bank subtree is the ONLY place where name/phone are stored.
     await pendingRef.set({id:winnerId,actionId:payload.actionId,distributionId:payload.distributionId,
       month:payload.month,name,phone,...(cpf?{cpf}:{}),...(companion?{companion}:{}),status:'PENDENTE',registeredAtMs:this.serverTimestamp(),operator});
     let x;
     try{x=await this.tx(payload.month,payload.distributionId,rows=>C.registerWinner(rows,{...payload,cpf:undefined,companion:undefined,id:winnerId},
       {operator,serverTimestamp:this.serverTimestamp(),day:C.nowDay()}));}
     catch(err){try{await pendingRef.remove();}catch(_){/* QA reconciliation log required */}throw err;}
     const action=x.dist.externalActions?.[payload.actionId];const winner=action?.winners?.[winnerId];
     assert(winner&&winner.status==='AGUARDANDO_RETIRADA','GANHADOR NÃO CONFERIU APÓS GRAVAR.');
     let bankError=null;
     try{
       const record=C.bankRecord({...winner,name,phone,companion},{...action,prize:x.dist.prize||x.dist.title},
         C.nowDay(Number(winner.registeredAtMs)||Date.now()));
       record.actionId=payload.actionId;
       if(cpf)record.cpf=cpf; // private winnerBank/records only; not public distributions
       const recordKey='EXTERNA_'+winnerId;
       const bankTx=await bankRoot.child('records/'+recordKey).transaction(v=>v||record,undefined,false);
       assert(bankTx.committed||bankTx.snapshot?.val(),'BANCO DE GANHADORES NÃO CONFIRMOU O REGISTRO.');
       await this.tx(payload.month,payload.distributionId,rows=>C.setBankStatus(rows,{...payload,winnerId,status:'CONFIRMADO'}));
       await pendingRef.remove();
     }catch(err){bankError=err;}
     return{...winner,name,companion,bankSynced:!bankError,bankError:bankError?.message||''};
   }
   async updateWinnerProfile(payload,operator){
     this.checkAuth();
     const month=await this.month(payload.month);
     const distribution=C.entries(month?.distributions).find(d=>d?.id===payload.distributionId);
     const action=distribution?.externalActions?.[payload.actionId];
     const winner=action?.winners?.[payload.winnerId];
     assert(winner&&winner.status!=='CANCELADO','GANHADOR NÃO ENCONTRADO OU CADASTRO CANCELADO.');
     const name=C.fullName(payload.name),phone=C.digits(payload.phone),cpf=C.cpfDigits(payload.cpf);
     assert(name.length>=5&&name.split(' ').length>=2,'INFORME NOME E SOBRENOME DO TITULAR.');
     assert(phone.length>=10&&phone.length<=13,'TELEFONE DO TITULAR INVÁLIDO. INFORME DDD.');
     assert(C.cpfValid(payload.cpf),'CPF DO TITULAR INVÁLIDO.');
     const companion=action.deliveryUnit==='pair'?C.companionDetails(payload.companion):null;
     assert(!companion||companion.name!==name,'ACOMPANHANTE DEVE SER DIFERENTE DO TITULAR.');
     assert(!companion?.cpf||!cpf||companion.cpf!==cpf,'CPF DO ACOMPANHANTE DEVE SER DIFERENTE DO TITULAR.');
     const bankRoot=this.db.ref(this.bankPath);
     const existing=(await bankRoot.child('records').get()).val()||{};
     const duplicate=C.entries(existing).some(item=>item?.sourceId!==winner.id&&
       item?.actionId===payload.actionId&&item?.deliveryStatus!=='CANCELADO'&&
       (C.fullName(item.name)===name||C.digits(item.phone)===phone));
     assert(!duplicate,'JÁ EXISTE OUTRO GANHADOR COM ESTE NOME OU TELEFONE NA AÇÃO.');
     const operationId=C.newId('EXTPROFILE'),bank=bankRoot.child('records/EXTERNA_'+winner.id);
     const result=await bank.transaction(prev=>{
       if(!prev||prev.sourceId!==winner.id)return;
       if(prev.profileAudit?.[operationId])return prev;
       const actor=String(operator||'PROMO EXTERNA').slice(0,100);
       return {...prev,name,phone,cpf:cpf||null,companion:companion||null,
         profileVersion:Number(prev.profileVersion||0)+1,
         profileUpdatedBy:actor,profileUpdatedAtMs:this.serverTimestamp(),
         profileAudit:{...(prev.profileAudit||{}),[operationId]:{
           operationId,action:'EDIÇÃO COMPLETA DO CADASTRO',actor,
           previousName:prev.name||'',currentName:name,
           previousCompanion:prev.companion?.name||'',currentCompanion:companion?.name||'',
           atMs:this.serverTimestamp()
         }}
       };
     },undefined,false);
     assert(result.committed,'ALTERAÇÃO NÃO CONFIRMADA NO BANCO CENTRAL.');
     return result.snapshot?.val()||{name,phone,cpf,companion};
   }
   async updateCompanion(payload,operator){
     this.checkAuth();
     const month=await this.month(payload.month);
     const d=C.entries(month?.distributions).find(x=>x?.id===payload.distributionId);
     const action=d?.externalActions?.[payload.actionId];
     const winner=action?.winners?.[payload.winnerId];
     assert(winner&&winner.status!=='CANCELADO','GANHADOR NÃO ENCONTRADO OU CADASTRO CANCELADO.');
     assert(action.deliveryUnit==='pair','ACOMPANHANTE SÓ PODE SER DEFINIDO PARA PAR DE INGRESSOS.');
     const companion=C.companionDetails(payload.companion);
     const bank=this.db.ref(this.bankPath+'/records/EXTERNA_'+winner.id);
     const operationId=C.newId('EXTCOMP');
     const tx=await bank.transaction(prev=>{
       if(!prev||prev.sourceId!==winner.id)return;
       if(companion&&C.fullName(prev.name)===companion.name)return;
       if(prev.companionAudit?.[operationId])return prev;
       const old=prev.companion?.name||'';
       return {...prev,companion:companion||null,
         companionRevision:Number(prev.companionRevision||0)+1,
         companionUpdatedAtMs:this.serverTimestamp(),companionUpdatedBy:String(operator||'OPERADOR PILOTO').slice(0,100),
         companionAudit:{...(prev.companionAudit||{}),[operationId]:{
           operationId,action:'ATUALIZAÇÃO DE ACOMPANHANTE',previousName:old,currentName:companion?.name||'',
           actor:String(operator||'OPERADOR PILOTO').slice(0,100),atMs:this.serverTimestamp()
         }}
       };
     },undefined,false);
     assert(tx.committed,'ALTERAÇÃO DO ACOMPANHANTE NÃO CONFIRMADA NO BANCO CENTRAL.');
     return tx.snapshot?.val()||{companion};
   }
   async retryBankSync(payload){
     this.checkAuth();const month=await this.month(payload.month);
     const d=C.entries(month.distributions).find(x=>x.id===payload.distributionId);
     const a=d?.externalActions?.[payload.actionId],w=a?.winners?.[payload.winnerId];
     assert(!!w&&w.status!=='CANCELADO','CADASTRO NÃO LOCALIZADO PARA CONCILIAÇÃO.');
     const bank=this.db.ref(this.bankPath),id='EXTERNA_'+w.id;
     const existing=(await bank.child('records/'+id).get()).val();
     const pending=(await bank.child('pendingExternal/'+id).get()).val();
     assert(existing||(pending&&pending.name&&pending.phone),'REGISTRO PENDENTE SEM IDENTIFICAÇÃO NO BANCO PROTEGIDO. ESCALAR AO SUPERVISOR.');
     const record=existing||{...C.bankRecord({...w,name:pending.name,phone:pending.phone,companion:pending.companion&&a.deliveryUnit==='pair'?C.companionDetails(pending.companion):null},{...a,prize:d.prize||d.title},
       C.nowDay(Number(w.registeredAtMs)||Date.now())),actionId:a.id};
     if(pending?.cpf&&C.cpfValid(pending.cpf)&&!record.cpf)record.cpf=C.cpfDigits(pending.cpf);
     const t=await bank.child('records/'+id).transaction(prev=>prev||record,undefined,false);
     assert(t.committed||t.snapshot?.val(),'BANCO CENTRAL NÃO CONFIRMOU A CONCILIAÇÃO.');
     await this.tx(payload.month,payload.distributionId,rows=>C.setBankStatus(rows,{...payload,status:'CONFIRMADO'}));
     if(pending)await bank.child('pendingExternal/'+id).remove();
     return true;
   }
   async pickup(payload,operator){
     const x=await this.tx(payload.month,payload.distributionId,rows=>C.registerPickup(rows,payload,{operator,serverTimestamp:this.serverTimestamp()}));
     const winner=x.dist.externalActions?.[payload.actionId]?.winners?.[payload.winnerId];
     assert(winner?.status==='RETIRADO','BAIXA NÃO CONFIRMADA.');
     // Keep source of truth in distribution. This mirror is idempotent and does not spend stock twice.
     try{await this.db.ref(this.bankPath+'/records/EXTERNA_'+winner.id).update({deliveredAtMs:winner.deliveredAtMs,deliveredBy:operator,deliveryStatus:'RETIRADO'});}
     catch(error){return{...winner,bankPickupPending:true,error:error.message};}
     return winner;
   }
   async cancelWinner(payload,operator){
     const x=await this.tx(payload.month,payload.distributionId,rows=>C.cancelWinner(rows,payload,{operator,serverTimestamp:this.serverTimestamp()}));
     const w=x.dist.externalActions?.[payload.actionId]?.winners?.[payload.winnerId];
     assert(w?.status==='CANCELADO','CANCELAMENTO NÃO CONFERIU.');return w;
   }
   onMonths(callback,onError){const ref=this.db.ref(this.statePath+'/months');ref.on('value',s=>callback(s.val()||{}),onError);return()=>ref.off('value');}
 }
 global.JPExternalRTDB=ExternalRTDB;
 if(typeof module==='object'&&module.exports)module.exports=ExternalRTDB;
})(typeof window!=='undefined'?window:globalThis);
