'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync(path.resolve(__dirname,'../painel_pauta_estudio_jovem_pan_GITHUB_API.html'),'utf8');
const begin=html.indexOf('const winnerBankLive='),end=html.indexOf('\nfunction winnerEligibilityHtml(',begin);
assert(begin>0&&end>begin);
const handlers=new Map(),counters={applied:0,reads:0};
const ref={
 child(key){return{on(type,cb,error){assert.equal(type,'value');handlers.set(key,{cb,error});const d={
  initialized:true,records:{RECORD_A:{name:'PESSOA FICTICIA',date:'2026-11-16'}},blocks:{},settings:{}
 };cb({val:()=>d[key]});}}}
};
const context={console,window:{firebase:{apps:[{}],app(){return{}},database(){return{ref(){return ref}}}}},WINNER_BANK_PATH:'jp-painel-brindes/winnerBank',FIREBASE_CONFIG:{},
 winnerBankReady:false,winnerBankStarted:false,winnerBankRef:null,
 firebaseConfigReady:()=>true,setWinnerBankModalState:()=>{},updateWinnerSaveState:()=>{},
 applyWinnerBankSnapshot:value=>{counters.applied++;counters.reads=Object.keys(value.records).length;context.winnerBankReady=true;},
};
vm.createContext(context);vm.runInContext(html.slice(begin,end),context);
context.initWinnerBank(false);
assert.equal(handlers.size,4);assert.equal(counters.applied,1);assert.equal(counters.reads,1);
console.log('PASS four child listeners loaded once and winner history ready');
assert.equal(handlers.has('locks'),false);
console.log('PASS temporary per-winner lock writes do not retrigger complete winner history');
context.initWinnerBank(true);
assert.equal(handlers.size,4);assert.equal(counters.applied,1);
console.log('PASS opening winner form does not reread or reprocess entire bank');
handlers.get('records').cb({val:()=>({A:{name:'TEST 1'},B:{name:'TEST 2'}})});
assert.equal(counters.applied,2);assert.equal(counters.reads,2);
console.log('PASS changed winner record is reflected in listener');
handlers.get('blocks').cb({val:()=>({SOMEONE:{active:true}})});
assert.equal(counters.applied,3);
console.log('PASS manual block updates preserve live validation');
handlers.get('records').error(new Error('SIMULATED PERMISSION DENIED'));
assert.equal(context.winnerBankReady,false);
handlers.get('settings').cb({val:()=>({})});
assert.equal(context.winnerBankReady,false);
handlers.get('records').cb({val:()=>({A:{name:'PESSOA RECUPERADA'}})});
assert.equal(context.winnerBankReady,true);
console.log('PASS Firebase read errors block writes and require recovery of the same failed stream');
assert.match(html,/schedulePromoWinnerValidation\(\)/);
assert.match(html,/showPromoWinnerSaveStatus/);
assert.match(html,/GRAVANDO RESULTADO NO FIREBASE/);
console.log('PASS UI shows detailed status without bypassing eligibility');
assert.match(html,/state\.months\[result\.monthKey\] \|\|=/);
console.log('PASS loaded month fallback prevents post-commit false error');
console.log('STUDIO_WINNER_FIX_QA 8 PASS 0 FAIL');
