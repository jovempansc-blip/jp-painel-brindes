const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const main=fs.readFileSync('index.html','utf8');
assert.match(main,/id="promoTextRotationEnabled"/);
assert.match(main,/id="promoRotationVariants"/);
assert.match(main,/id="promoAddRotationVariant"/);
assert.match(main,/\.\.\.promoRotationForm\(existing\)/);
assert.match(main,/promoRotationReset\(p\)/);
assert.match(main,/promoRotationDraft\.some\(v=>!textNorm\(v.text\)\)/);

async function verifyStudio(filename){
  const html=fs.readFileSync(filename,'utf8');
  const begin=html.indexOf('function studioPautaTextVariants(');
  const end=html.indexOf('function startPromoRead(promoId)',begin);
  assert(begin>=0&&end>begin,filename+' helpers');
  const segment=html.slice(begin,end);
  const p={id:'PAUTA',name:'TESTE',kind:'pauta',station:'JP1017',description:'TEXTO A',textRotationEnabled:true,
    textRotationStartedAt:'2026-10-01T10:00:00Z',textVariants:[{id:'v1',text:'TEXTO A'},{id:'v2',text:'TEXTO B'},{id:'v3',text:'TEXTO C'}],readLog:[]};
  const date='2026-10-15',month='2026-10',other='2026-09',item={date,slot:'08H',program:'ROCK'};
  const read=(id,text,date='2026-10-15')=>({id,confirmedAt:date+'T08:05:00Z',textVariantId:id==='A'?'v1':id==='B'?'v2':'v3',textSnapshot:text, date,slot:'08H'});
  const ctx={state:{months:{'2026-09':{promos:[{id:p.id,readLog:[]}]},'2026-10':{promos:[p]}}},todayISO:()=>date,
    studioAV57Logs:(p,i)=>(p.readLog||[]).filter(x=>x.date===i.date),studioAV57Progress:()=>({remaining:1})};
  vm.createContext(ctx);vm.runInContext(segment,ctx);
  assert.equal(ctx.studioPautaRotationChoice(p,item).text,'TEXTO A','primeira versão');
  // Leitura não realizada não avança.
  p.missedLog=[{date,slot:'08H',status:'NÃO REALIZADA'}];
  assert.equal(ctx.studioPautaRotationChoice(p,item).text,'TEXTO A','omissão não deve avançar');
  p.readLog.push(read('A','TEXTO A'));
  assert.equal(ctx.studioPautaRotationChoice(p,item).text,'TEXTO B','segunda versão após uma confirmação');
  p.readLog.push(read('B','TEXTO B'));
  assert.equal(ctx.studioPautaRotationChoice(p,item).text,'TEXTO C','terceira versão após duas confirmações');
  p.readLog.push(read('C','TEXTO C'));
  assert.equal(ctx.studioPautaRotationChoice(p,item).text,'TEXTO A','reinicia ciclo');
  // Confirmações antigas não marcadas como versão não entram na sequência.
  p.readLog.push({id:'LEGADO',confirmedAt:'2026-09-25T10:00:00Z',textSnapshot:'TEXTO LEGADO'});
  assert.equal(ctx.studioPautaRotationChoice(p,item).text,'TEXTO A');
  // Histórico mantém snapshot anterior mesmo que editor altere o texto.
  p.textVariants[0].text='TEXTO A REVISTO';
  ctx.studioAV57Progress=()=>({remaining:0});
  assert.equal(ctx.studioPautaRotationChoice(p,item).text,'TEXTO C','registro confirmado não muda retroativamente');
  ctx.studioAV57Progress=()=>({remaining:1});
  // O mês seguinte considera confirmações do mês anterior, sem reiniciar.
  const november={...p,readLog:[]};ctx.state.months['2026-11']={promos:[november]};
  const future={date:'2026-11-02',slot:'10H',program:'NOVO'};
  assert.equal(ctx.studioPautaRotationChoice(november,future).text,'TEXTO A REVISTO');
  // concorrência: leitura confirmada por outra sessão após abrir impede gravação com texto desatualizado.
  assert.match(html,/displayedVariantId!==rotationVersion\.id/,'guarda anti-duplicidade');
  assert.match(html,/textVariantId:rotationVersion\?\.id/,'identificação da versão em histórico');
  assert.match(html,/textSnapshot:rotationVersion\?rotationVersion\.text/,'snapshot do texto exato');
  assert.match(html,/staleRotation\?'OUTRA CONFIRMAÇÃO/,'erro de confirmação obsoleta');
  assert.match(html,/data-text-variant-id=/,'identificar texto apresentado');
  return filename;
}
(async()=>{
  await verifyStudio('painel_pauta_estudio_jovem_pan_GITHUB_API.html');
  await verifyStudio('painel_pauta_estudio_jovem_pan_news.html');
  console.log('PASS: AV58.1.22 múltiplas versões, confirmação, histórico, omissão, virada de mês, News e prevenção de versão obsoleta (simulado)');
})().catch(e=>{console.error(e);process.exitCode=1});

// Exercita a transação simulada e a verificação da versão apresentada.
async function verifyTransaction(filename){
  const html=fs.readFileSync(filename,'utf8');
  const begin=html.indexOf('function studioPautaTextVariants('),end=html.indexOf('function startPromoRead(promoId)',begin);
  const cstart=html.indexOf('async function confirmPromoReadV56(event){'),cend=html.indexOf('async function confirmPromoRead(event)',cstart);
  assert(begin>=0&&end>begin&&cstart>=0&&cend>cstart);
  const date='2026-10-16',station=filename.includes('news')?'JPNEWS983':'JP1017';
  const p={id:'PAUTA_X',kind:'pauta',name:'PAUTA TESTE',description:'PRIMEIRO',textRotationEnabled:true,textVariants:[{id:'v1',text:'PRIMEIRO'},{id:'v2',text:'SEGUNDO'}],readLog:[]};
  let stored=JSON.parse(JSON.stringify(p));const state={months:{'2026-10':{promos:[JSON.parse(JSON.stringify(p))]}}};
  const item={date,slot:'08H',program:'TESTE'};let opened={id:'v1',text:'PRIMEIRO'},alerts=[],writes=0,returns=0;
  const button={dataset:{busy:'0'},disabled:false,textContent:'✓',classList:{contains:()=>false,add(){},remove(){}},setAttribute(){}};
  const sb={
    console:{error(){}},alert:x=>alerts.push(x),document:{querySelector:()=>({dataset:{textVariantId:opened.id},textContent:opened.text})},
    $:x=>x==='confirmPromoReadInline'?button:null,
    currentPromoForRead:()=>state.months['2026-10'].promos[0],currentDisplayItem:item,studioReadSaving:false,studioResultSaving:false,studioCampaignContext:null,
    studioRequiredReadsForHour:()=>2,studioReadCountForHour:x=>(x.readLog||[]).filter(v=>v.date===date).length,
    studioMissedCountForHour:()=>0,
    studioOperatorIdentity:()=>({name:'QA',sector:'ESTÚDIO'}),newsOperatorIdentity:()=>({name:'QA',sector:'ESTÚDIO'}),
    ensureStudioFirebaseOnline:async()=>{},readHourKey:()=> 'TEST-KEY',studioRecordMonths:()=> ['2026-10'],studioOutcomeMonthKey:()=> '2026-10',newsMonthKey:()=> '2026-10',
    todayISO:()=>date,studioRetry:fn=>fn(),studioAV57Logs:x=>(x.readLog||[]).filter(v=>v.date===date),studioAV57Progress:()=>({remaining:1}),validReadTimestamp:x=>x||'',hourMapValue:()=>' ',
    window:{firebase:{database:{ServerValue:{TIMESTAMP:1}}}},STUDIO_STATION:station,
    pad:n=>String(n).padStart(2,'0'),formatStudioTime:v=>v,timeToHHMM:()=> '08:00',programFromSchedule:()=> 'TESTE',upper:v=>String(v).toUpperCase(),
    pautaTypeLabel:()=> 'PAUTA',studioOpecTextType:()=> 'legacy',studioOpecVersion:()=> 1,
    firebaseRef:{child(){return this},async transaction(cb){const changed=cb([JSON.parse(JSON.stringify(stored))]);if(!changed)return{committed:false,snapshot:{val:()=>[stored]}};stored=changed[0];writes++;return{committed:true,snapshot:{val:()=>changed}}},async update(){}},
    state,appendStudioAudit:async()=>{},appendNewsAudit:async()=>{},currentHourKey:()=>date+'-08-0',returnStudioToNow(){returns++},render(){returns++},
    studioPostReadPrizeHourKey:''
  };
  vm.createContext(sb);
  vm.runInContext(html.slice(begin,end),sb);vm.runInContext(html.slice(cstart,cend),sb);
  const press=()=>sb.confirmPromoReadV56({preventDefault(){},stopPropagation(){},currentTarget:button});
  await press();
  assert.equal(stored.readLog.length,1,filename+' first stored');assert.equal(stored.readLog[0].textSnapshot,'PRIMEIRO');
  assert.equal(stored.readLog[0].textVariantId,'v1');
  assert.equal(writes,1);assert.equal(alerts.length,0);
  // Segunda sessão deixou exibido texto anterior enquanto outra gravou a próxima versão.
  await press();assert.equal(writes,1,filename+' stale version may not be confirmed twice');
  assert.equal(stored.readLog.length,1);assert.equal(alerts.length,1);assert.match(alerts[0],/OUTRA CONFIRMAÇÃO/);
  opened={id:'v2',text:'SEGUNDO'};alerts=[];
  await press();
  assert.equal(writes,2);assert.equal(stored.readLog.length,2);
  assert.equal(stored.readLog[1].textSnapshot,'SEGUNDO');assert.equal(stored.readLog[1].textVariantId,'v2');
  assert.equal(alerts.length,0);
}
(async()=>{
  await verifyTransaction('painel_pauta_estudio_jovem_pan_GITHUB_API.html');
  await verifyTransaction('painel_pauta_estudio_jovem_pan_news.html');
  console.log('PASS: AV58.1.22 transações simuladas, snapshots corretos e rejeição de confirmação desatualizada em ambos os estúdios');
})().catch(e=>{console.error(e);process.exitCode=1});
