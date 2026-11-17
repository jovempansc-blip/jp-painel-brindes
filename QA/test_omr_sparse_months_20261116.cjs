'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.resolve(__dirname,'../merchan_radios.html'),'utf8');
const start=html.indexOf('function opecNormalizeMonthSnapshot('),end=html.indexOf('\nconst opecApplyMonth=',start);
const code=html.slice(start,end);
const ctx={Object,Array,console};vm.createContext(ctx);vm.runInContext(code,ctx);
let n=0;const check=(name,fn)=>{fn();console.log('PASS',++n,name)};
check('sparse numeric object converts to array with preserved Firebase indexes',()=>{
 const x=ctx.opecNormalizeMonthSnapshot({promos:{'1':{id:'B'},'4':{id:'E'}}});
 assert(Array.isArray(x.promos));assert.equal(x.promos.length,5);assert.equal(x.promos[1].id,'B');assert.equal(x.promos[4].id,'E');assert.equal(x.promos[0],undefined);
});
check('a second deletion locates the correct original physical key',()=>{
 const x=ctx.opecNormalizeMonthSnapshot({promos:{'1':{id:'B'},'4':{id:'E'}}});
 const index=Object.entries(x.promos).find(([,row])=>row?.id==='E')[0];assert.equal(index,'4');
});
check('already-array data is not reindexed',()=>{
 const original=[{id:'A'},null,{id:'C'}];const x=ctx.opecNormalizeMonthSnapshot({promos:original});
 assert.equal(x.promos,original);assert.equal(x.promos[2].id,'C');
});
check('object with nonnumeric keys normalizes to populated list',()=>{
 const x=ctx.opecNormalizeMonthSnapshot({promos:{abc:{id:'A'},def:{id:'D'}}});assert.equal(x.promos.length,2);
});
check('month without promos remains usable',()=>{
 const x=ctx.opecNormalizeMonthSnapshot({label:'2026-11'});assert.equal(x.label,'2026-11');
});
console.log('OMR_SPARSE_ARRAY',n,'PASS 0 FAIL');
