/* JP Workspace — Promo Externa implementation candidate. No production writes by distribution. */
(function(root,factory){
  const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.JPExternalCore=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const MONTH=/^\d{4}-(0[1-9]|1[0-2])$/;
  const DAY=/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;
  const ZONE='America/Sao_Paulo';
  const clone=o=>o===undefined?undefined:JSON.parse(JSON.stringify(o));
  const entries=o=>Array.isArray(o)?o.filter(Boolean):Object.values(o||{}).filter(Boolean);
  const integer=(v)=>Number.isSafeInteger(Number(v))&&Number(v)>=0?Number(v):NaN;
  const unit=x=>String(x||'').toLowerCase()==='pair'?'pair':'unit';
  const multiplier=x=>unit(x)==='pair'?2:1;
  const fullName=x=>String(x||'').trim().replace(/\s+/g,' ').toUpperCase().slice(0,160);
  const digits=x=>String(x||'').replace(/\D/g,'').slice(0,15);
  const nowDay=(clock=Date.now())=>new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(clock));
  const newId=(prefix='EXT')=>prefix+'_'+(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID().replace(/-/g,''):Math.random().toString(36).slice(2)+Date.now().toString(36));
  function fail(code,message){const e=new Error(message);e.code=code;throw e;}
  function validation(condition,code,message){if(!condition)fail(code,message);}
  function storedRows(value){return Array.isArray(value)?value:(value&&typeof value==='object'?value:{});}
  function getDistribution(rows,id){
    if(Array.isArray(rows))return{index:rows.findIndex(d=>d&&d.id===id),data:rows.find(d=>d&&d.id===id)};
    const key=Object.keys(rows||{}).find(k=>rows[k]?.id===id);return{index:key,data:key===undefined?undefined:rows[key]};
  }
  function withDistribution(rows,id,fn){
    const result=clone(storedRows(rows));const target=getDistribution(result,id);
    validation(!!target.data,'DIST_NOT_FOUND','PRÊMIO NÃO ENCONTRADO NA COMPETÊNCIA OFICIAL.');
    result[target.index]=fn(target.data);
    return result;
  }
  const externalUnit=d=>unit(d?.ticketUnits?.rua||d?.ticketDefaultUnit);
  function quotaUnits(d){const q=integer(d?.rua);validation(Number.isFinite(q),'QUOTA_INVALID','COTA EXTERNA INVÁLIDA.');return q*multiplier(externalUnit(d));}
  const actions=d=>Object.values(d?.externalActions||{}).filter(a=>a&&a.status!=='CANCELADA');
  function actionReservedUnits(d){return actions(d).reduce((n,a)=>n+(integer(a.allocatedUnits)||0),0);}
  function remainingUnallocated(d){return Math.max(0,quotaUnits(d)-actionReservedUnits(d));}
  function consumedUnits(a){return Object.values(a?.winners||{}).filter(w=>w&&w.status!=='CANCELADO').reduce((n,w)=>n+(integer(w.qtyUnits)||0),0);}
  function balanceUnits(a){return Math.max(0,integer(a?.allocatedUnits)-consumedUnits(a));}
  function visible(a,day=nowDay()){
    return a?.status==='ATIVA'&&DAY.test(a.startsOn||'')&&DAY.test(a.endsOn||'')&&a.startsOn<=day&&a.endsOn>=day;
  }
  function dayValid(day){if(!DAY.test(day||''))return false;const d=new Date(day+'T12:00:00Z');return!Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===day;}
  function createActionRecord(d,payload,metadata={}){
    validation(!!d?.id,'DIST_REQUIRED','SELECIONE UM PRÊMIO CADASTRADO.');
    const title=String(payload.title||'').trim().replace(/\s+/g,' ').slice(0,150);
    validation(title.length>=3,'TITLE_REQUIRED','INFORME O NOME DA AÇÃO EXTERNA.');
    validation(dayValid(payload.startsOn)&&dayValid(payload.endsOn)&&payload.startsOn<=payload.endsOn,'DATES_INVALID','CORRIJA AS DATAS DA AÇÃO.');
    validation(!d.startDate||payload.startsOn>=d.startDate,'BEFORE_PRIZE','A AÇÃO COMEÇA ANTES DA VIGÊNCIA DO PRÊMIO.');
    validation(!d.endDate||payload.endsOn<=d.endDate,'AFTER_PRIZE','A AÇÃO TERMINA DEPOIS DA VIGÊNCIA DO PRÊMIO.');
    const quantity=integer(payload.quantity);
    validation(Number.isFinite(quantity)&&quantity>0,'QTY_INVALID','INFORME UMA QUANTIDADE INTEIRA POSITIVA.');
    const deliveryUnit=externalUnit(d),allocatedUnits=quantity*multiplier(deliveryUnit);
    validation(Number.isSafeInteger(allocatedUnits)&&allocatedUnits<=remainingUnallocated(d),'QUOTA_EXCEEDED','COTA EXTERNA INSUFICIENTE PARA ESSA AÇÃO.');
    const id=payload.id||newId('AÇÃO');
    return{id,title,startsOn:payload.startsOn,endsOn:payload.endsOn,distributionId:d.id,distributionMonth:payload.month,
      deliveryUnit,quantity,allocatedUnits,status:'ATIVA',winners:{},createdAtMs:metadata.serverTimestamp||Date.now(),
      createdBy:String(metadata.operator||'').slice(0,100),version:1,schemaVersion:1};
  }
  function createAction(rows,payload,meta={}){
    validation(MONTH.test(payload.month||''),'MONTH_INVALID','COMPETÊNCIA INVÁLIDA.');
    let created;
    const next=withDistribution(rows,payload.distributionId,d=>{
      const action=createActionRecord(d,payload,meta);validation(!d.externalActions?.[action.id],'DUPLICATE_ACTION','ESTA AÇÃO JÁ EXISTE.');
      d.externalActions={...(d.externalActions||{}),[action.id]:action};created=clone(action);return d;
    });return{rows:next,created};
  }
  function registerWinner(rows,payload,meta={}){
    let created;
    const result=withDistribution(rows,payload.distributionId,d=>{
      const a=d.externalActions?.[payload.actionId];validation(!!a,'ACTION_MISSING','AÇÃO NÃO LOCALIZADA.');
      validation(visible(a,meta.day||nowDay()),'ACTION_INACTIVE','A AÇÃO NÃO ESTÁ ATIVA NESTA DATA.');
      validation(quotaUnits(d)>=actionReservedUnits(d),'QUOTA_SHRUNK','COTA EXTERNA REDUZIDA ABAIXO DAS RESERVAS.');
      const name=fullName(payload.name),phone=digits(payload.phone);
      validation(name.length>=5,'NAME_INVALID','INFORME O NOME COMPLETO.');
      validation(phone.length>=10&&phone.length<=13,'PHONE_INVALID','INFORME O TELEFONE COM DDD.');
      const qty=integer(payload.quantity||1);
      validation(Number.isFinite(qty)&&qty>0,'WINNER_QTY_INVALID','QUANTIDADE POR GANHADOR INVÁLIDA.');
      const qtyUnits=qty*multiplier(a.deliveryUnit);
      validation(Number.isSafeInteger(qtyUnits)&&qtyUnits<=balanceUnits(a),'ACTION_BALANCE','SALDO DA AÇÃO INSUFICIENTE.');
      // Personal data and duplicate-person checks belong to the restricted winnerBank subtree.
      // Never persist name/phone in the publicly readable distribution records.
      const winnerId=payload.id||newId('EXTW');
      validation(!a.winners?.[winnerId],'WINNER_ID_CONFLICT','REGISTRO DE GANHADOR DUPLICADO.');
      const winner={id:winnerId,actionId:a.id,distributionId:d.id,distributionMonth:a.distributionMonth,
        quantity:qty,qtyUnits,deliveryUnit:a.deliveryUnit,status:'AGUARDANDO_RETIRADA',bankStatus:'PENDENTE',
        registeredAtMs:meta.serverTimestamp||Date.now(),registeredBy:String(meta.operator||'').slice(0,100),
        sourceRef:'EXTERNA:'+a.id+':'+winnerId};
      a.winners={...(a.winners||{}),[winnerId]:winner};a.version=(integer(a.version)||1)+1;
      created={...clone(winner),name,phone}; // transient ONLY; no PII in the distribution transaction
      return d;
    });return{rows:result,created};
  }
  function setBankStatus(rows,payload){
    return withDistribution(rows,payload.distributionId,d=>{
      const w=d.externalActions?.[payload.actionId]?.winners?.[payload.winnerId];
      validation(!!w,'WINNER_NOT_FOUND','GANHADOR NÃO LOCALIZADO.');
      w.bankStatus=payload.status==='CONFIRMADO'?'CONFIRMADO':'PENDENTE';return d;
    });
  }
  function registerPickup(rows,payload,meta={}){
    let updated;
    const next=withDistribution(rows,payload.distributionId,d=>{
      const winner=d.externalActions?.[payload.actionId]?.winners?.[payload.winnerId];
      validation(!!winner,'WINNER_NOT_FOUND','GANHADOR NÃO ENCONTRADO.');
      validation(winner.bankStatus==='CONFIRMADO','BANK_NOT_SYNCED','CADASTRO AINDA NÃO CONFIRMADO NO BANCO CENTRAL.');
      validation(winner.status==='AGUARDANDO_RETIRADA','ALREADY_DELIVERED','RETIRADA JÁ REGISTRADA OU CANCELADA.');
      winner.status='RETIRADO';winner.deliveredAtMs=meta.serverTimestamp||Date.now();winner.deliveredBy=String(meta.operator||'').slice(0,100);
      updated=clone(winner);return d;
    });return{rows:next,updated};
  }
  function cancelWinner(rows,payload,meta={}){
    return withDistribution(rows,payload.distributionId,d=>{
      const w=d.externalActions?.[payload.actionId]?.winners?.[payload.winnerId];
      validation(!!w,'WINNER_NOT_FOUND','GANHADOR NÃO ENCONTRADO.');
      validation(w.status==='AGUARDANDO_RETIRADA','WINNER_IMMUTABLE','PRÊMIO JÁ ENTREGUE. NÃO É POSSÍVEL CANCELAR.');
      w.status='CANCELADO';w.cancelledAtMs=meta.serverTimestamp||Date.now();w.cancelledBy=String(meta.operator||'').slice(0,100);return d;
    });
  }
  function flatten(months,activeOnly=false,day=nowDay()){
    const out=[];
    Object.entries(months||{}).forEach(([month,m])=>entries(m?.distributions).forEach(d=>{
      Object.values(d.externalActions||{}).forEach(a=>{
        if(!a||activeOnly&&!visible(a,day))return;
        out.push({...a,distributionMonth:month,distributionId:d.id,prize:d.prize||d.title||d.show||'',
          physicalTotal:quotaUnits(d),remaining:balanceUnits(a),consumed:consumedUnits(a),winners:Object.values(a.winners||{})});
      });
    }));return out;
  }
  function bankRecord(winner,action,day=nowDay()){
    return{id:'EXTERNA_'+winner.id,name:winner.name,date:day,program:'PROMO EXTERNA · '+action.title,
      prize:action.prize||'',personKey:fullName(winner.name).replace(/\s+/g,'_'),prizeKey:fullName(action.prize||'').replace(/\s+/g,'_'),
      source:'PROMO_EXTERNA',sourceRef:winner.sourceRef,sourceId:winner.id,phone:digits(winner.phone),quantity:winner.quantity,
      createdAtMs:winner.registeredAtMs,createdAt:new Date(Number(winner.registeredAtMs)||Date.now()).toISOString()};
  }
  return{clone,entries,integer,unit,multiplier,fullName,digits,nowDay,newId,dayValid,externalUnit,quotaUnits,actions,
    actionReservedUnits,remainingUnallocated,consumedUnits,balanceUnits,visible,createAction,registerWinner,
    setBankStatus,registerPickup,cancelWinner,flatten,bankRecord,withDistribution};
});
