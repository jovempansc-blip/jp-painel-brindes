'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.resolve(__dirname,'../merchan_radios.html'),'utf8');
const start=html.indexOf('async function ensureOpecOnline(){');
const end=html.indexOf('\nasync function appendOpecAudit(',start);
const fragment=html.slice(start,end);
let n=0;const test=async(name,fn)=>{await fn();console.log('PASS',++n,name)};
function context({online=true,connected=false,server='pending'}={}){
 const callbacks=[],errs=[],timers=[];
 const mock={Promise,Error,console,navigator:{onLine:online},setTimeout:(fn)=>{timers.push(fn);return timers.length},clearTimeout:()=>{},opecConnected:connected,
   opecConnectionRef:{
     on(evt,cb,err){callbacks.push(cb);errs.push(err);if(server==='online')cb({val:()=>true});if(server==='offline')cb({val:()=>false});if(server==='error')err(new Error('SIMULATED FAILURE'));},
     off(){},
   }
 };
 vm.createContext(mock);vm.runInContext(fragment,mock);
 return{mock,callbacks,errs,timers};
}
(async()=>{
 await test('sem rede, falha imediatamente antes de cadastrar/excluir',async()=>{
  const x=context({online:false});
  await assert.rejects(x.mock.ensureOpecOnline(),/NAVEGADOR SEM CONEXÃO/);
 });
 await test('socket RTDB já conectado libera operação imediatamente',async()=>{
  const x=context({connected:true});
  assert.equal(await x.mock.ensureOpecOnline(),true);
  assert.equal(x.callbacks.length,0);
 });
 await test('um valor falso do RTDB não libera escrita',async()=>{
  const x=context({server:'offline'});
  let resolved=false;const p=x.mock.ensureOpecOnline().then(()=>resolved=true).catch(()=>{});
  await Promise.resolve();assert.equal(resolved,false);
  x.callbacks[0]({val:()=>true});await p;assert.equal(resolved,true);
 });
 await test('socket posteriormente reconectado libera operação',async()=>{
  const x=context({server:'pending'});const p=x.mock.ensureOpecOnline();
  x.callbacks[0]({val:()=>true});
  assert.equal(await p,true);
 });
 await test('erro de listener interrompe operação',async()=>{
  const x=context({server:'error'});
  await assert.rejects(x.mock.ensureOpecOnline(),/SIMULATED FAILURE/);
 });
 await test('timeout do RTDB comunica erro específico ao operador',async()=>{
  const x=context({server:'pending'});
  const p=x.mock.ensureOpecOnline();x.timers[0]();
  await assert.rejects(p,/FIREBASE NÃO CONFIRMOU CONEXÃO/);
 });
 console.log('OMR_CONNECTION_GATE',n,'PASS 0 FAIL');
})().catch(err=>{console.error(err.stack||err);process.exitCode=1});
