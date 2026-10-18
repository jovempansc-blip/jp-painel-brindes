const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.join(__dirname,'..');
const admin=fs.readFileSync(path.join(root,'index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'assets/prog-manual.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/prog-manual.css'),'utf8');
assert(admin.includes('data-jp-prog-mode="grade"')&&admin.includes('data-jp-prog-mode="manual"'));
assert(admin.includes('id="programManualMount"')&&admin.includes('id="programGradeContainer"'));
assert(admin.includes('src="assets/prog-manual.js?v=AV58_1_26"')); // Recurso atualizado deve vencer o cache
assert(admin.includes('href="assets/prog-manual.css?v=AV58_1_20"'));
assert(js.includes("root.child('months').child(targetMonth).transaction"),'A gravação deve usar transação no mês');
assert(js.includes('const oldItems=rows(remote?.items)'),'Deve comparar gravações concorrentes');
assert(js.includes("if(!tx?.committed)throw"),'Não deve informar sucesso sem confirmação');
assert(js.includes("locked(item)"),'Registros confirmados não devem ser movidos');
assert(js.includes('totalAvailable(d)-used(d)'),'O saldo deve acompanhar a programação');
assert(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'));
function functionSource(text,name){const start=text.indexOf(`function ${name}(`);assert(start>=0,name);let pos=text.indexOf('{',start),depth=0,quote='',escape=false;for(let i=pos;i<text.length;i++){const c=text[i];if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote='';continue;}if(c==='\''||c==='"'||c==='`'){quote=c;continue;}if(c==='{')depth++;if(c==='}'&&--depth===0)return text.slice(start,i+1);}throw Error('malformed '+name);}
for(const file of ['painel_pauta_estudio_jovem_pan_GITHUB_API.html','painel_pauta_estudio_jovem_pan_news.html']){
 const html=fs.readFileSync(path.join(root,file),'utf8');
 const source=functionSource(html,'studioRequiredReadsForHour');
 const sandbox={STUDIO_STATION:file.includes('news')?'JPNEWS983':'JP1017',studioAV57Visible:()=>true,stationAllowed:()=>true,programFromSchedule:()=> 'ROCK N POP',upper:v=>String(v).toUpperCase(),studioAV57HourSlot:v=>String(v).match(/\d{2}/)?.[0]+'H',normalizeStationValue:v=>v,studioRequiredReadsAutomatic:()=>0};
 vm.createContext(sandbox);vm.runInContext(source,sandbox);
 const p={promoReadMethod:'manual',manualReadAssignments:[{date:'2026-10-16',station:sandbox.STUDIO_STATION,slot:'08H',program:'ROCK N POP'}]};
 assert.strictEqual(sandbox.studioRequiredReadsForHour(p,{date:'2026-10-16',slot:'08H',program:'ROCK N POP'}),1);
 assert.strictEqual(sandbox.studioRequiredReadsForHour(p,{date:'2026-10-16',slot:'09H',program:'ROCK N POP'}),0);
 assert(html.includes('studioMultiPrizeMarkup(rows,item)'),'Estúdio permite escolher diversos prêmios na hora');
}
console.log('PASS: UI/links locais, transação e modo manual nos dois estúdios (verificação isolada)');
