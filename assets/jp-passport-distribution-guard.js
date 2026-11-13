(function(root,factory){
 const api=factory(root.JPPassportCore);
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./jp-passport-core.js'));
 else root.JPPassportDistributionGuard=api;
})(typeof window==='object'?window:globalThis,function(C){
'use strict';
async function verify(stateRef,proposed,monthKey){
 if(!C)throw Error('MÓDULO DE PASSAPORTE INDISPONÍVEL. EDIÇÃO BLOQUEADA PARA PRESERVAR RESERVAS.');
 if(!stateRef||typeof stateRef.child!=='function')throw Error('BASE DO FIREBASE INDISPONÍVEL. NÃO FOI POSSÍVEL CONFERIR OS PASSAPORTES.');
 if(!proposed||!monthKey||!proposed.id)throw Error('DISTRIBUIÇÃO OU COMPETÊNCIA INVÁLIDA.');
 const snap=await stateRef.child('passportCampaigns').get();
 const remote=snap.val()||{},validation=C.assertDistributionChange({passportCampaigns:remote},monthKey,proposed);
 if(!validation.ok)throw Error('DISTRIBUIÇÃO BLOQUEADA: '+validation.reason+' REVISE AS RESERVAS DOS PASSAPORTES.');
 return {ok:true,checkedAt:new Date().toISOString(),commitments:C.commitments({passportCampaigns:remote},monthKey,proposed.id,'reservado')};
}
async function verifyDeletion(stateRef,distributionId){
 if(!C||!stateRef)throw Error('VERIFICAÇÃO DE PASSAPORTES INDISPONÍVEL.');
 const snap=await stateRef.child('passportCampaigns').get();
 for(const cfg of Object.values(snap.val()||{})){
  if(C.list(cfg?.events).some(x=>String(x.distributionId)===String(distributionId)))
   throw Error('O PRÊMIO ESTÁ VINCULADO A UMA PROMOÇÃO PASSAPORTE. DESVINCULE-O PRIMEIRO, SE NÃO HOUVER GANHADORES.');
 }
 return {ok:true};
}
return Object.freeze({verify,verifyDeletion});
});
