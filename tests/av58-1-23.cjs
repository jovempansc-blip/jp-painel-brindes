const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.join(__dirname,'..');const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const a=html.indexOf('/* AV58.1.23 — Evento com versões datadas');const b=html.indexOf('function distributionStockUpdateProposal(',a);
assert(a>0&&b>a,'NOVO CADASTRO DE EVENTO AUSENTE');
const code=html.slice(a,b);
const fields={
 distId:{value:''},distPrize:{value:'OKTOBERFEST 2026'},distTicketDefaultUnit:{value:'pair'},
 distDescription:{value:'Ingressos para o festival'},distPrizeType:{value:'ingresso'},
 distForm:{querySelector:()=>({disabled:false})},distEventVersions:{hidden:false},
 distEventMode:{value:'event',addEventListener(){}},distEventAdd:{addEventListener(){}},
 distEventRows:{addEventListener(){}},distEventFoot:{textContent:''}
};
Object.values(fields).forEach(field=>field.closest=()=>({classList:{toggle(){}}}));
let next=0,flushError=false,created=[];
const state={months:{'2026-10':{distributions:[],items:[]}},prizeCatalog:{},auditLog:[],currentMonth:'2026-10'};
const mock={console,Date,Set,Array,Object,Number,Promise,
 document:{querySelectorAll(){return [];}},$:(id)=>fields[id]||null,state,
 id:(prefix)=>prefix+'_'+(++next),norm:x=>String(x||'').trim().toUpperCase(),
 textNorm:x=>String(x||'').trim(),formatBR:s=>s.split('-').reverse().join('/'),
 promoStyleFromForm:()=>({}),clone:x=>JSON.parse(JSON.stringify(x)),
 firebaseReady:true,firebaseRef:{},firebaseConnected:true,firebaseServerLoaded:true,firebasePendingSave:false,
 saveState:()=>true,flushFirebaseNow:async()=>{if(flushError)throw new Error('offline');return true;},
 storeDistributionAcrossMonths:d=>{created.push(d);state.months['2026-10'].distributions.push(d);},
 rememberPrizeCatalog:()=>{},auditEvent:()=>{},closeDrawer:()=>{},render:()=>{},toast:()=>{},alert:()=>{},todayISO:()=> '2026-10-16',
 openDrawer:()=>{}
};
vm.createContext(mock);vm.runInContext(code,mock);
const put=rows=>vm.runInContext('eventVariantRows='+JSON.stringify(rows)+';',mock);
const row=(title,eventDate,drawStart,drawEnd,units)=>({key:title,title,eventDate,drawStart,drawEnd,units,description:''});
put([row('Ingressos sábado','2026-10-24','2026-10-16','2026-10-17','20'),row('Ingressos sábado seguinte','2026-10-31','2026-10-26','2026-10-30','40')]);
let data=vm.runInContext('eventVersionData()',mock);
assert.equal(data.versions.length,2);assert.equal(data.versions[0].units,20);
(async()=>{
 assert.equal(await vm.runInContext('saveEventVariantsFromForm()',mock),true);
 assert.equal(created.length,2);assert.notEqual(created[0].id,created[1].id);
 assert.equal(created[0].eventGroupId,created[1].eventGroupId);
 assert.equal(created[0].ar,10);assert.equal(created[1].ar,20);
 assert.equal(created[0].total,20);assert.equal(created[1].total,40);
 assert.equal(created[0].eventDate,'2026-10-24');assert.equal(created[1].startDate,'2026-10-26');
 assert(created[0].title.includes('24/10/2026')&&created[1].title.includes('31/10/2026'));
 assert(created[0].description.includes('DATA DE UTILIZAÇÃO'));
 put([row('Quantidade inválida','2026-10-24','2026-10-16','2026-10-17','3')]);
 assert.throws(()=>vm.runInContext('eventVersionData()',mock),/MÚLTIPLO DE 2/);
 put([row('Fim depois do evento','2026-10-24','2026-10-16','2026-10-25','2')]);
 assert.throws(()=>vm.runInContext('eventVersionData()',mock),/TERMINA APÓS/);
 put([row('Duplicada','2026-10-24','2026-10-16','2026-10-17','2'),row('Duplicada','2026-10-24','2026-10-17','2026-10-18','2')]);
 assert.throws(()=>vm.runInContext('eventVersionData()',mock),/REPETE/);
 // Another date in a linked event does not overwrite its prior versions.
 vm.runInContext('eventLinkGroupId='+JSON.stringify(created[0].eventGroupId),mock);
 put([row('Ingressos nova sessão','2026-11-01','2026-10-28','2026-10-30','4')]);
 assert.equal(await vm.runInContext('saveEventVariantsFromForm()',mock),true);
 assert.equal(created.length,3);assert.equal(created[2].eventGroupId,created[0].eventGroupId);
 assert.equal(state.months['2026-10'].distributions.length,3);
 put([row('Falha de confirmação','2026-11-02','2026-10-28','2026-10-30','2')]);flushError=true;
 assert.equal(await vm.runInContext('saveEventVariantsFromForm()',mock),false);
 assert.equal(state.months['2026-10'].distributions.length,3,'Rollback local preserva registros');
 // Old distribution editing should carry its event metadata.
 assert(html.includes("if(existing.eventGroupId){['eventGroupId'"));
 assert(html.includes('if(!existing.eventGroupId)syncDistributionToLinkedRadioItems(d)'));
 assert(fs.existsSync(path.join(root,'assets/event-variants.css')));
 assert(/distEventMode/.test(html)&&/eventVersionOpenForGroup/.test(html));
 console.log('PASS: evento por data, pares, janelas, vínculo, acréscimo, rollback simulado e preservação do cadastro padrão');
})().catch(e=>{console.error(e);process.exitCode=1;});
