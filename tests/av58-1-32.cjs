const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),main=fs.readFileSync(path.join(root,'index.html'),'utf8');
const script=fs.readFileSync(path.join(root,'assets/prog-manual.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/prog-manual.css'),'utf8');
assert(main.includes('assets/prog-manual.js?v=AV58_1_35'));
assert(main.includes('assets/prog-manual.css?v=AV58_1_33'));
assert(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'));
assert(main.includes('function promoEditorHasAnyPlannedRead(draft)'));
assert(main.includes("if(p.promoReadMethod!=='manual' && !promoEditorHasAnyPlannedRead(p))"));
assert(main.includes("jpFirebaseMeasure('promocao_confirmacao_firebase'"));
assert(main.includes("jpFirebaseMeasure('promocao_total'"));
assert(main.includes("typeof firebaseDatabase.goOnline==='function'&&!firebaseConnected"));

const date='2026-10-19';
const context={
 state:{months:{'2026-10':{promos:[
 {id:'P1',kind:'pauta',name:'PAUTA 1',station:'JP1017',startDate:date,endDate:'2026-10-31',manualReadAssignments:[]},
 {id:'P2',kind:'promo',name:'PROMO 2',station:'JP1017',startDate:date,endDate:'2026-10-31',manualReadAssignments:[]},
 {id:'M1',kind:'merchan',name:'MERCHAN 1',station:'JP1017',startDate:date,endDate:'2026-10-31',manualReadAssignments:[],opecPublicationStatus:'published'},
 {id:'M2',kind:'merchandising',name:'MERCHAN 2',station:'JP1017',startDate:date,endDate:'2026-10-31',manualReadAssignments:[],opecPublicationStatus:'published'}
 ],items:[],distributions:[{id:'D1',title:'PRÊMIO EXEMPLO',startDate:date,endDate:'2026-10-31',ar:4}]}}},
 todayISO:()=>date,document:{readyState:'loading',addEventListener(){},getElementById(){return null;}},window:{},
 sameStation:(a,b)=>a===b,distStartDate:d=>d.startDate,distEndDate:d=>d.endDate,
 distributionLabel:d=>d.title,itemStation:i=>i.station,normalizeSlot:x=>x,programFromSchedule:()=>'ROCK N POP',
 console,Date,Map,Set,Number,JSON,String,Array,Object,Math
};
vm.createContext(context);
const modified=script.replace(/\}\)\(\);\s*$/,'window.__av32={initialize(){date="2026-10-19";station="JP1017";draft=snapshot();},setTab(tab){manualTab=tab;},setPautaQuery(q){pautaQuery=q;},setMerchanQuery(q){merchanQuery=q;},renderSidebar,pautaRows,promoPool};})();');
assert(modified.includes('window.__av32'));
vm.runInContext(modified,context);
const s=context.window.__av32;s.initialize();
s.setTab('prizes');let html=s.renderSidebar();assert(html.includes('PRÊMIOS (1)'));assert(html.includes('PAUTAS (2)'));assert(html.includes('MERCHAN (2)'));
assert(html.includes('PRÊMIO EXEMPLO'));
s.setTab('pautas');html=s.renderSidebar();assert(html.includes('PAUTA 1')&&html.includes('PROMO 2'));
assert(!html.includes('MERCHAN 1')&&!html.includes('MERCHAN 2'));
assert(html.includes('data-drag-type="pauta"'));
s.setTab('merchans');html=s.renderSidebar();assert(html.includes('MERCHAN 1')&&html.includes('MERCHAN 2'));
assert(!html.includes('PAUTA 1')&&!html.includes('PROMO 2'));
assert(html.includes('data-drag-type="pauta"'),'merchan preserva tipo de registro para salvamento');
s.setMerchanQuery('2');html=s.renderSidebar();assert(html.includes('MERCHAN 2')&&!html.includes('MERCHAN 1'));
s.setTab('pautas');s.setPautaQuery('PAUTA');html=s.renderSidebar();assert(html.includes('PAUTA 1')&&!html.includes('PROMO 2'));
s.setTab('merchans');assert(s.renderSidebar().includes('MERCHAN 2'),'busca não se mistura entre abas');

// Mesma regra de elegibilidade que a geração completa; busca curta deve
// encerrar assim que encontrar a primeira leitura válida.
const code=main.slice(main.indexOf('function promoEditorHasAnyPlannedRead('),main.indexOf('function promoEditorShowTab(',main.indexOf('function promoEditorHasAnyPlannedRead(')));
assert(code.startsWith('function promoEditorHasAnyPlannedRead('));
let poolReads=0,assignmentReads=0;
const fake={
 adminAV572DateRange:()=>Array.from({length:31},(_,i)=>`2026-10-${String(i+1).padStart(2,'0')}`),
 promoEditorPoolForDate:(draft,day)=>{poolReads++;return [draft];},
 adminAV572Assignments:(draft,day,station)=>{assignmentReads++;return day.endsWith('03')&&station==='JP1017'?[{slot:'08H'}]:[];}
};
vm.createContext(fake);vm.runInContext(code,fake);
const draft={startDate:'2026-10-01',endDate:'2026-10-31',station:'JP1017',opecPrograms:[{program:'ROCK N POP',hours:['08']}],promoReadWeekdays:[1,2,3],promoReadDateMode:'range'};
assert.equal(fake.promoEditorHasAnyPlannedRead(draft),true);
assert.equal(assignmentReads,3,'para na primeira leitura válida');assert.equal(poolReads,1,'reaproveita pool mensal');
poolReads=0;assignmentReads=0;
assert.equal(fake.promoEditorHasAnyPlannedRead({...draft,opecPrograms:[]}),false);assert.equal(assignmentReads,0,'sem programação não consulta histórico');
poolReads=0;assignmentReads=0;
assert.equal(fake.promoEditorHasAnyPlannedRead({...draft,promoReadWeekdays:[],promoReadSpecificDates:[]}),false);assert.equal(assignmentReads,0);
assert(main.includes('await flushFirebaseNow(`${promoKindLabel(kind)} SALVA`);'),'confirmação real mantida');
console.log('PASS: AV58.1.32 · 3 abas, buscas isoladas, arrastar preservado, leitura válida curta e confirmação Firebase');
