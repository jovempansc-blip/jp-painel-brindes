const A=require('node:assert/strict');
const C=require('../assets/jp-passport-core.js');
const G=require('../assets/jp-passport-distribution-guard.js');
const fs=require('node:fs');
let n=0;
async function run(){
 const check=async(title,fn)=>{await fn();n++;console.log('PASS',n,title);};
 const d={id:'EV',prizeType:'ingresso',reservas:[{id:'RSV',qty:2,unit:'pair'}]};
 const c={x:{events:[{monthKey:'2026-12',distributionId:'EV',segment:'reservado',reservationId:'RSV',units:4}]}};
 const ref=data=>({child:key=>({get:async()=>({val:()=>data})})});
 await check('verifica compromisso remoto antes da alteração',async()=>A.equal((await G.verify(ref(c),d,'2026-12')).ok,true));
 await check('nega reduzir reserva previamente vinculada no servidor',async()=>{
  const t=structuredClone(d);t.reservas[0].qty=1;await A.rejects(G.verify(ref(c),t,'2026-12'),/COMPROMETID/);
 });
 await check('nega base inacessível',async()=>await A.rejects(G.verify(null,d,'2026-12'),/FIREBASE/));
 await check('nega competência vazia',async()=>await A.rejects(G.verify(ref(c),d,''),/INVÁLIDA/));
 await check('nega qualquer falha na consulta do servidor',async()=>await A.rejects(G.verify({child:()=>({get:async()=>{throw Error('PERMISSION_DENIED')}})},d,'2026-12'),/PERMISSION_DENIED/));
 await check('proteção incorporada na gravação oficial do prêmio',async()=>{
  const s=fs.readFileSync(require('node:path').resolve(__dirname,'../index.html'),'utf8');
  const i=s.indexOf('async function saveDistributionFromForm('),block=s.slice(i,i+16000);
  A(block.indexOf('verifyDistributionBeforeSave')>=0);
  A(block.indexOf('JPPassportDistributionGuard.verify')>block.indexOf('verifyDistributionBeforeSave'));
  A(block.indexOf('JPPassportDistributionGuard.verify')<block.indexOf('storeDistributionAcrossMonths(d,state.currentMonth'));
 });
 console.log('DISTRIBUICAO GUARD',n,'PASS 0 FAIL');
}
run().catch(e=>{console.error(e);process.exitCode=1});

