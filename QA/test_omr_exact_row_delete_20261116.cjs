'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.resolve(__dirname,'../merchan_radios.html'),'utf8');
const from=html.indexOf('function opecDeletionMonths('),to=html.indexOf('\nfunction readKeys(',from);
assert(from>0&&to>from);
const chunk=html.slice(from,to);
let tests=0;const test=async(name,fn)=>{await fn();console.log('PASS',++tests,name)};
const clone=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
function fixture({failMonth='',failAudit=false,failVerifyMonth='',choice='TUDO',approve=true}={}){
  const original={'2026-10':[{id:'O1',kind:'merchan'},{id:'P_OTHER',kind:'promo',image:'BASE64_VERY_LARGE'}],'2026-11':[{id:'O1',kind:'merchan'},{id:'P2',kind:'promo',image:'BASE64_VERY_LARGE'}],'2026-12':[{id:'O1',kind:'merchan'}]};
  const remote=clone(original),local=clone(Object.fromEntries(Object.entries(original).map(([m,promos])=>[m,{promos}])));
  const log=[],writes=[],warnings=[],alerts=[],status=[],confirmations=[],promptText=[];
  let readCount=0;
  const ref={
    child(x){return pathRef([x])},
    async update(p){writes.push({type:'metadata',path:'root'});return true}
  };
  function pathRef(parts){return{
    child(x){return pathRef([...parts,String(x)])},
    async transaction(action){
      const [months,month,promos,index]=parts;
      assert.equal(months,'months');assert.equal(promos,'promos');assert.equal(parts.length,4);
      if(month===failMonth)throw Error('SIMULATED OFFLINE MONTH');
      const current=clone(remote[month][Number(index)]);
      const result=action(current);
      if(result===undefined)return{committed:false,snapshot:{val:()=>current}};
      remote[month][Number(index)]=clone(result);writes.push({type:'record',path:parts.join('/'),previous:current?.id});
      return {committed:true,snapshot:{val:()=>clone(result)}};
    },
    async get(){readCount++;const [x,month,y,index]=parts;if(month===failVerifyMonth)throw Error('NETWORK LOST AFTER WRITE');return{val:()=>clone(remote[month][Number(index)])}}
  }}
  const context={console,Date,Math,Promise,String,Number,Object,Array,Error,
    state:{months:local},ref,
    norm:v=>String(v||'').trim().toUpperCase(),
    validMonthKey:key=>/^\d{4}-\d\d$/.test(key),
    opecRecordMonths:id=>Object.entries(local).filter(([k,d])=>d.promos.some(p=>p?.id===id)).map(([k])=>k).sort(),
    opecOperationMonth:(item,months)=>months.includes('2026-11')?'2026-11':months[0],
    opecOperatorIdentity:()=>({name:'OPERADOR QA',sector:'OPEC'}),
    ensureOpecOnline:async()=>true,
    opecRetry:fn=>fn(),
    appendOpecAudit:async entry=>{if(failAudit)throw Error('AUDIT WRITE FAILED');log.push(clone(entry))},
    firebase:{database:{ServerValue:{TIMESTAMP:'SENTINEL'}}},
    opecClientName:()=> 'CLIENTE FICTÍCIO',findMerchan:id=>({p:{name:'TESTE',id}}),
    prompt:(txt,def)=>{promptText.push(txt);return choice},
    confirm:txt=>{confirmations.push(txt);return approve},
    alert:text=>alerts.push(text),setSaveState:(a,b)=>status.push([a,b]),
    render:()=>{},window:{},
  };
  vm.createContext(context);vm.runInContext(chunk,context);
  return {context,remote,local,log,writes,warnings,alerts,status,confirmations,promptText,get readCount(){return readCount}};
}
(async()=>{
  await test('Exclusão mensal preserva outubro e dezembro',async()=>{
    const f=fixture();const r=await f.context.deleteRecord('O1','month');
    assert.equal(r.removedMonths.length,1);assert.equal(f.remote['2026-11'][0],null);
    assert.equal(f.remote['2026-10'][0].id,'O1');assert.equal(f.remote['2026-12'][0].id,'O1');
  });
  await test('Exclusão integral remove somente o merchan nas três competências',async()=>{
    const f=fixture();const r=await f.context.deleteRecord('O1','all');
    assert.equal(r.removedMonths.length,3);
    assert(['2026-10','2026-11','2026-12'].every(m=>f.remote[m][0]===null));
  });
  await test('Nenhuma promoção alheia é removida',async()=>{
    const f=fixture();await f.context.deleteRecord('O1','all');
    assert.equal(f.remote['2026-10'][1].id,'P_OTHER');assert.equal(f.remote['2026-11'][1].image,'BASE64_VERY_LARGE');
  });
  await test('Não regrava a coleção de promoções inteira',async()=>{
    const f=fixture();await f.context.deleteRecord('O1','all');
    assert.equal(f.writes.filter(x=>x.type==='record').length,3);
    assert(f.writes.every(x=>x.type!=='record'||/\/promos\/0$/.test(x.path)));
  });
  await test('Conferência é feita no registro exato excluído',async()=>{
    const f=fixture();await f.context.deleteRecord('O1','all');
    assert.equal(f.readCount,3);
  });
  await test('Auditoria informa todas as competências removidas',async()=>{
    const f=fixture();await f.context.deleteRecord('O1','all');
    assert.equal(f.log.length,1);assert.match(f.log[0].note,/2026-10, 2026-11, 2026-12/);
  });
  await test('Falha parcial sinaliza meses gravados e não gravados',async()=>{
    const f=fixture({failMonth:'2026-12'});
    await assert.rejects(f.context.deleteRecord('O1','all'),/EXCLUSÃO PARCIAL OU NÃO CONFIRMADA/);
    assert.equal(f.remote['2026-10'][0],null);assert.equal(f.remote['2026-12'][0].id,'O1');
    assert.equal(f.log[0].action,'EXCLUSÃO PARCIAL DO MERCHAN');
  });
  await test('ID desconhecido falha sem qualquer escrita',async()=>{
    const f=fixture();await assert.rejects(f.context.deleteRecord('UNKNOWN','all'),/CADASTRO NÃO LOCALIZADO/);
    assert.equal(f.writes.length,0);
  });
  await test('Escopo de exclusão inválido falha sem escrita',async()=>{
    const f=fixture();await assert.rejects(f.context.deleteRecord('O1','invalid'),/ESCOPO DE EXCLUSÃO INVÁLIDO/);
    assert.equal(f.writes.length,0);
  });
  await test('Confirmação de TUDO é obrigatória antes de apagar',async()=>{
    const f=fixture({approve:false});f.context.confirmDeleteMerchan('O1');await new Promise(r=>setImmediate(r));
    assert.equal(f.writes.length,0);
    assert.match(f.confirmations[0],/TODAS AS COMPETÊNCIAS/);
  });
  await test('Escolha COMPETENCIA não exclui os outros meses',async()=>{
    const f=fixture({choice:'COMPETENCIA'});f.context.confirmDeleteMerchan('O1');await new Promise(r=>setImmediate(r));
    assert.equal(f.remote['2026-11'][0],null);
    assert.equal(f.remote['2026-10'][0].id,'O1');
  });
  await test('Entrada inválida nunca provoca exclusão',async()=>{
    const f=fixture({choice:'OUTRA'});f.context.confirmDeleteMerchan('O1');await new Promise(r=>setImmediate(r));
    assert.equal(f.writes.length,0);assert.equal(f.confirmations.length,0);
  });
  await test('Navegador sem internet não faz nenhuma gravação',async()=>{
    const f=fixture();f.context.ensureOpecOnline=async()=>{throw Error('OFFLINE')};
    await assert.rejects(f.context.deleteRecord('O1','all'),/OFFLINE/);assert.equal(f.writes.length,0);
  });
  await test('auditoria indisponível não transforma exclusão confirmada em não salvo',async()=>{
    const f=fixture({failAudit:true}),r=await f.context.deleteRecord('O1','all');
    assert.equal(r.auditPending,true);assert.equal(r.removedMonths.length,3);
    assert(['2026-10','2026-11','2026-12'].every(m=>f.remote[m][0]===null));
  });
  await test('falha de conferência após a transação exige conciliação e não repete exclusão',async()=>{
    const f=fixture({failVerifyMonth:'2026-11'}),r=await f.context.deleteRecord('O1','all');
    assert.deepEqual(Array.from(r.verificationPending),['2026-11']);
    assert.equal(f.remote['2026-11'][0],null);
    assert.equal(f.writes.filter(x=>x.type==='record').length,3);
  });
  console.log('OMR_EXACT_ROW_DELETION',tests,'PASS 0 FAIL');
})().catch(e=>{console.error('FAIL',e.stack||e);process.exitCode=1});
