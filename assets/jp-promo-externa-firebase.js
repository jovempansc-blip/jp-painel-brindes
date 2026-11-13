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
     this.auth=options.auth||null;this.requireAuth=options.requireAuth!==false;this.secureBankVerified=options.secureBankVerified===true;
     // Allows ONLY an action without winners/PII from the already operating main panel.
     // All winner registration, pickup, cancellation and private bank actions retain checkAuth().
     this.allowNonPersonalActions=options.allowNonPersonalActions===true;
   }
   checkAuth(){
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
     const name=C.fullName(payload.name),phone=C.digits(payload.phone);
     assert(name.length>=5&&phone.length>=10,'NOME COMPLETO E TELEFONE COM DDD SÃO OBRIGATÓRIOS.');
     // Read protected winnerBank records to avoid repeated names/phones in same action.
     const all=await Promise.all([bankRoot.child('records').get(),bankRoot.child('pendingExternal').get()]);
     const already=[...C.entries(all[0].val()),...C.entries(all[1].val())].some(r=>
       r.actionId===payload.actionId&&r.status!=='CANCELADO'&&(C.fullName(r.name)===name||C.digits(r.phone)===phone));
     assert(!already,'OUVINTE JÁ CONSTA COMO GANHADOR DESTA AÇÃO.');
     // Secure bank subtree is the ONLY place where name/phone are stored.
     await pendingRef.set({id:winnerId,actionId:payload.actionId,distributionId:payload.distributionId,
       month:payload.month,name,phone,status:'PENDENTE',registeredAtMs:this.serverTimestamp(),operator});
     let x;
     try{x=await this.tx(payload.month,payload.distributionId,rows=>C.registerWinner(rows,{...payload,id:winnerId},
       {operator,serverTimestamp:this.serverTimestamp(),day:C.nowDay()}));}
     catch(err){try{await pendingRef.remove();}catch(_){/* QA reconciliation log required */}throw err;}
     const action=x.dist.externalActions?.[payload.actionId];const winner=action?.winners?.[winnerId];
     assert(winner&&winner.status==='AGUARDANDO_RETIRADA','GANHADOR NÃO CONFERIU APÓS GRAVAR.');
     let bankError=null;
     try{
       const record=C.bankRecord({...winner,name,phone},{...action,prize:x.dist.prize||x.dist.title},
         C.nowDay(Number(winner.registeredAtMs)||Date.now()));
       record.actionId=payload.actionId;
       const recordKey='EXTERNA_'+winnerId;
       const bankTx=await bankRoot.child('records/'+recordKey).transaction(v=>v||record,undefined,false);
       assert(bankTx.committed||bankTx.snapshot?.val(),'BANCO DE GANHADORES NÃO CONFIRMOU O REGISTRO.');
       await this.tx(payload.month,payload.distributionId,rows=>C.setBankStatus(rows,{...payload,winnerId,status:'CONFIRMADO'}));
       await pendingRef.remove();
     }catch(err){bankError=err;}
     return{...winner,name,bankSynced:!bankError,bankError:bankError?.message||''};
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
     const record=existing||{...C.bankRecord({...w,name:pending.name,phone:pending.phone},{...a,prize:d.prize||d.title},
       C.nowDay(Number(w.registeredAtMs)||Date.now())),actionId:a.id};
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
