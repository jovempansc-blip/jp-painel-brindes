const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const names=['painel_pauta_estudio_jovem_pan_GITHUB_API.html','painel_pauta_estudio_jovem_pan_news.html'];
for(const name of names){
  const html=fs.readFileSync(path.join(__dirname,'..',name),'utf8');
  assert(html.includes('const MANUAL_RETURN_MS=10000;'),'retorno após 10 segundos');
  assert(html.includes('id="studioTimeSelect"'),'horário clicável');
  assert(html.includes('id="studioDateSelect"'),'data clicável');
  assert(html.includes('type="date" value="${esc(date)}"'),'calendário nativo');
  assert(html.includes('data-studio-go-time'),'seleção de horários');
  assert(html.includes('studioConsultOtherDate()'),'modo consulta');
  const a=html.indexOf('/* AV58.1.31 — Consulta temporária'),b=html.indexOf('function buildStudioContext(item,promo){',a);
  assert(a>=0&&b>a,'funções de consulta incluídas');
  const code=html.slice(a,b);
  const date='2026-10-19',calls=[];
  const ctx={Date,Number,Set,Map,String,Math,STUDIO_STATION:name.includes('news')?'JPNEWS983':'JP1017',window:{innerWidth:1400,innerHeight:900,addEventListener(){}},document:{activeElement:{blur(){calls.push('blur');}},addEventListener(){},getElementById(){return null;}},
    manual:false,manualHourDateMs:null,selectedIndex:8,selectedPromoId:'P2',studioSelectedPrizeId:'Z',studioReadContext:null,studioReadSheetPromoId:null,studioCampaignContext:null,studioReadSaving:false,studioResultSaving:false,
    todayISO:()=>date,dateISO:d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,pad:x=>String(x).padStart(2,'0'),
    slotParts:value=>{const m=String(value||'').match(/^(\d\d):(00|30)$/);return m?{hour:Number(m[1]),minute:Number(m[2])}:null;},timeToHHMM:x=>x,minutesOf:x=>Number(x.slice(0,2))*60+Number(x.slice(3,5)),formatStudioTime:x=>x,programFromSchedule:(d,slot)=>d===date&&['08:00','09:00'].includes(slot)?'ROCK N POP':'',
    allPrizeRows:()=>[{id:'A',date,slot:'10:30',title:'PRÊMIO PROGRAMADO'}],esc:x=>x,formatBR:x=>x,
    currentSlotDate:()=>new Date('2026-10-19T08:00:00'),
    studioCloseConsultPickers(){calls.push('close');},scheduleManualReturn(){calls.push('timer');},render(){calls.push('render');},confirm:()=>true,
    $:()=>null};
  vm.createContext(ctx);vm.runInContext(code,ctx);
  const slots=ctx.studioConsultSlots(date);
  assert.deepEqual(Array.from(slots,x=>x.slot),['08:00','09:00','10:30'],'somente horários oficiais ou materiais programados');
  assert.equal(ctx.studioConsultSlotDate('2026-02-30','08:00'),null,'data inválida não consulta');
  assert.equal(ctx.studioGoToConsultDate(date,'09:00'),true);
  assert.equal(ctx.manual,true);assert.equal(new Date(ctx.manualHourDateMs).getHours(),9);
  assert.equal(ctx.selectedPromoId,null);assert(calls.includes('timer')&&calls.includes('render'));
  assert.equal(ctx.studioConsultOtherDate(),false);
  assert.equal(ctx.studioGoToConsultDate('2026-10-20','09:00'),true);
  assert.equal(ctx.studioConsultOtherDate(),true);
  // Nunca escrevemos no Firebase ao selecionar data ou horário.
  assert.equal(code.includes('.transaction('),false);assert.equal(code.includes('.update('),false);
}
console.log('PASS: 2 estúdios · horários oficiais, calendário, retorno e consulta sem escrita');
