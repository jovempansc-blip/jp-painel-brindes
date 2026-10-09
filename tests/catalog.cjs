const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8');
const start=source.indexOf('function prizeCatalogMatchesStatus');
assert.ok(start>=0,'catalog must support status filters');
const end=source.indexOf('function renderPrizeCatalog',start);
const ctx={};vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
const cases=[
 [{description:'',draws:[]},'all',true],
 [{description:'',draws:[]},'missing',true],
 [{description:'OK',draws:[]},'missing',false],
 [{description:'OK',draws:[]},'described',true],
 [{description:'',draws:[{}]},'awarded',true],
 [{description:'',draws:[]},'awarded',false],
 [{description:'',draws:[]},'undrawn',true],
 [{description:'',draws:[{}]},'undrawn',false]
];
for(const [entry,status,expected] of cases)assert.equal(ctx.prizeCatalogMatchesStatus(entry,status),expected);
console.log('PASS: 8 catalog filter cases');
