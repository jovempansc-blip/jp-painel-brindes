'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const current=fs.readFileSync(path.join(root,'index.html'),'utf8');
const baseline=fs.readFileSync('/mnt/files/jp-board-work/candidate-distribution/index.html','utf8');
const styleTag='<style id="jp-distribution-visual-fit-20261111">';
const opening=current.indexOf(styleTag),closing=current.indexOf('</style>',opening);
if(opening<0||closing<opening)throw Error('Hotfix style not found');
const css=current.slice(opening+styleTag.length,closing);
const cleaned=current.slice(0,opening)+current.slice(closing+'</style>'.length);
const original=current.replace(/\n+<style id="jp-distribution-visual-fit-20261111">[\s\S]*?<\/style>\n+/,'\n');
let pass=0,fail=0;
function test(name,fn){try{fn();console.log('PASS',++pass,name);}catch(err){fail++;console.error('FAIL',name,err.stack||err);}}
const getNumber=(selector,property)=>{
 const normalized=selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const rx=new RegExp(normalized+'\\s*\\{([^}]+)\\}');
 const m=css.match(rx);
 if(!m)throw Error('Selector absent: '+selector);
 const mm=m[1].match(new RegExp(property.replace('-','\\-')+'\\s*:\\s*(\\d+)px'));
 if(!mm)throw Error('Prop absent: '+property+' in '+selector);
 return Number(mm[1]);
};

test('no modification to JS, Firebase, markup or other CSS sections',()=>{
 assert.equal(original,baseline,'Only the new isolated style is allowed');
});
test('exactly one isolated style and one existing document head',()=>{
 assert.equal(current.split(styleTag).length,2);
 assert.equal((current.match(/<\/head>/g)||[]).length,1);
 assert.equal((current.match(/id="jp-distribution-visual-fit-20261111"/g)||[]).length,1);
});
test('the hotfix is scoped to detailed distribution table',()=>{
 assert(css.includes('#view-distribuicao #distDetailedView'));
 assert(!css.includes('#distCompactView'));
});
test('15 columns in header, colgroup and rendered body',()=>{
 const container=current.slice(current.indexOf('<table class="distMainTable">'),current.indexOf('<tbody id="distTable">'));
 assert.equal((container.match(/<col class=/g)||[]).length,15);
 assert.equal((container.match(/<th\b/g)||[]).length,15);
 const a=current.indexOf('return `<tr data-dist-row=');
 const b=current.indexOf('</tr>`;',a);
 assert(a>=0&&b>a);
 assert.equal((current.slice(a,b).match(/<td\b/g)||[]).length,15);
});
test('columns have stable total width 1684px',()=>{
 const widths=Array.from({length:15},(_,i)=>getNumber('#distDetailedView .distMainTable col:nth-child('+(i+1)+')','width'));
 assert.equal(widths.reduce((a,b)=>a+b,0),1684);
 assert.equal(widths[14],244);
});
test('table minimum width equals sum of col widths',()=>{
 assert.match(css,/min-width:1684px!important/);
 assert(css.includes('table-layout:fixed!important'));
 assert(css.includes('width:100%!important'));
});
test('action column has capacity for the longest seven-icon row',()=>{
 const action=244,padding=7*2,buttons=7*27+6*5;
 assert(buttons<=action-padding);
 assert(css.includes('gap:5px!important'));
 assert(css.includes('flex:0 0 27px!important'));
 assert(css.includes('min-width:244px!important'));
});
test('actions no longer clipped and still form a single row',()=>{
 assert(css.includes('overflow:visible!important'));
 assert(css.includes('flex-wrap:nowrap!important'));
 assert(css.includes('.distMainTable td.distActionsCell'));
});
test('container scrolls horizontally instead of collapsing table',()=>{
 assert(css.includes('overflow-x:auto!important'));
 assert(css.includes('max-width:100%!important'));
 assert(css.includes('overscroll-behavior-x:contain'));
});
test('body and header use the same HTML table without divergent grids',()=>{
 const html=current.slice(current.indexOf('<table class="distMainTable">'),current.indexOf('<tbody id="distTable">'));
 assert(html.includes('<colgroup>'));
 assert(!html.includes('grid-template-columns'));
 assert(css.includes('table-layout:fixed!important'));
});
test('radio balance note can wrap without overflowing other columns',()=>{
 assert(css.includes('.distSaldoStack small'));
 assert(css.includes('white-space:normal!important'));
 assert(css.includes('line-height:1.25!important'));
});
test('sticky first column and header retained',()=>{
 assert.match(baseline,/\.distMainTable th:first-child\s*,/);
 assert.match(baseline,/position:sticky;/);
 assert(css.includes('.distMainTable th:first-child'));
});
test('desktop can expand to avoid scroll when width permits',()=>{
 assert(css.includes('body:has(#view-distribuicao.active #distDetailedView:not([hidden])) .wrap'));
 assert(css.includes('width:min(1850px,100%)!important'));
});
test('smaller screens retain bounded scroll instead of hiding last actions',()=>{
 assert(css.includes('@media (max-width:900px)'));
 assert(css.includes('min-width:1684px!important'));
 assert(css.includes('overflow-x:auto!important'));
});
test('no JavaScript or data-binding changes in patch',()=>{
 assert.equal((current.match(/<script/g)||[]).length,(baseline.match(/<script/g)||[]).length);
 assert.equal((current.match(/firebaseStateRootRef/g)||[]).length,(baseline.match(/firebaseStateRootRef/g)||[]).length);
 assert.equal((current.match(/stockLedger/g)||[]).length,(baseline.match(/stockLedger/g)||[]).length);
});
console.log('VISUAL QA RESULT',pass,'PASS',fail,'FAIL');
if(fail)process.exitCode=1;
