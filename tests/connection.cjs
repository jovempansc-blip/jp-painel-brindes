const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname,'..')+'/';
async function run(){
 for(const [file,name,flag,ref] of [['preview_recepcao.html','ensureReceptionOnline','receptionConnected','firebaseRef'],['merchan_radios.html','ensureOpecOnline','opecConnected','ref']]){
  const src=fs.readFileSync(root+file,'utf8'),start=src.indexOf('async function '+name),end=src.indexOf('\n}',start)+2;
  let reads=0;const ctx={navigator:{onLine:true},[flag]:true,[ref]:{child:()=>({get:()=>{reads++;return Promise.resolve();}})},Promise,setTimeout:(fn,ms)=>{const t=setTimeout(fn,ms);t.unref();return t;},receptionStageError:(stage,e)=>e};vm.createContext(ctx);vm.runInContext(src.slice(start,end),ctx);
  await ctx[name]();assert.equal(reads,0,file+': connection must not add a round trip before writes');
  ctx[flag]=false;await ctx[name]();assert.equal(reads,1,file+': uncertain connection still requires a probe');
  ctx.navigator.onLine=false;await assert.rejects(ctx[name](),/SEM CONEXÃO/);
 }
 console.log('PASS: 6 connection cases');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
