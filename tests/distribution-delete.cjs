const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8');
function extract(start,end){const at=src.indexOf(start);assert.ok(at>=0,start);return src.slice(at,src.indexOf(end,at));}
const ctx={clone:x=>JSON.parse(JSON.stringify(x)),num:Number,distributionSnapshotOriginMonth:()=> '2026-09',distributionPeriodMonthKeys:()=>['2026-09','2026-10'],distributionOperationalFingerprint:()=>'',distributionOperationallyEmpty:()=>true,balancedIntegerSplit:()=>({}),allocateCampaignOperationalValues:()=>{throw new Error('Migrated campaign must not be rebuilt');}};
vm.createContext(ctx);vm.runInContext(extract('function migrateLegacyDistributionGroup','function hydrateLegacyDistributionSnapshots'),ctx);
const data={months:{'2026-09':{distributions:[{id:'D',stockModelVersion:3,total:10}]},'2026-10':{distributions:[]}}};
assert.equal(ctx.migrateLegacyDistributionGroup(data,'D',[{monthKey:'2026-09',d:data.months['2026-09'].distributions[0]}]),0,'deletion from migrated month must survive normalization');
assert.equal(data.months['2026-10'].distributions.length,0);
const countStart=src.indexOf('function countStateRecords');
vm.runInContext(src.slice(countStart,src.indexOf('function firebaseList',countStart)),ctx);
vm.runInContext(extract('function workspaceEmptyAfterTrackedDeletion','async function saveStateToApi'),ctx);
const baseline={months:{'2026-10':{distributions:[{id:'D'}],items:[],promos:[]}},schedules:[],programSchedules:[],trash:[]};
const empty={months:{'2026-10':{distributions:[],items:[],promos:[]}},schedules:[],programSchedules:[],trash:[{id:'TR1',type:'DISTRIBUIÇÃO',sourceId:'D',monthKey:'2026-10'}]};
assert.equal(ctx.workspaceEmptyAfterTrackedDeletion(empty,baseline),true);
assert.equal(ctx.workspaceEmptyAfterTrackedDeletion({...empty,trash:[]},baseline),false);
assert.equal(ctx.workspaceEmptyAfterTrackedDeletion(empty,{...baseline,trash:empty.trash}),false);
assert.equal(ctx.workspaceEmptyAfterTrackedDeletion(empty,{...baseline,months:{'2026-10':{distributions:[{id:'D'},{id:'OTHER'}]}}}),false);
console.log('PASS: migrated month deletion and 4 empty-state protection cases');
