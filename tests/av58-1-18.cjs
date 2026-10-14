const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const studio=fs.readFileSync('painel_pauta_estudio_jovem_pan_GITHUB_API.html','utf8');
function section(start,end){const a=studio.indexOf(start),b=studio.indexOf(end,a+start.length);assert(a>=0&&b>a,`Seção inexistente: ${start}`);return studio.slice(a,b);}
assert.doesNotMatch(studio,/id="studioReadingDueBanner"/,'Banner vermelho inferior deve desaparecer do DOM');
assert.doesNotMatch(studio,/refreshStudioReadingDueBanner/,'Não renderizar aviso inferior a cada atualização');
assert.match(studio,/id="studioSidePromoRail"/,'Alertas laterais preservados');
assert.match(studio,/id="studioSideMerchanRail"/,'Alertas laterais de merchan preservados');
assert.match(studio,/returnStudioToNow\(\)/,'Deve existir retorno à programação padrão');

const choose={studioPostReadPrizeHourKey:'',currentHourKey:()=> '2026-10-14-16-0'};
vm.createContext(choose);
vm.runInContext(section('function studioHourlyRowsForDisplay(rows){','function render(){'),choose);
const prize={id:'PR1',date:'2026-10-14',slot:'16H',sourceType:'prize'};
const virtualResult={id:'RES1',date:'2026-10-14',slot:'16H',sourceType:'promo-result'};
const rows=[virtualResult,prize];
assert.equal(choose.studioHourlyRowsForDisplay(rows).length,2,'Antes de confirmar, agendamento existente não muda');
choose.studioPostReadPrizeHourKey='2026-10-14-16-0';
assert.deepEqual([...choose.studioHourlyRowsForDisplay(rows)].map(x=>x.id),['PR1'],'Depois da confirmação, deve escolher o prêmio padrão, não o resultado virtual');
choose.currentHourKey=()=> '2026-10-14-17-0';
assert.equal(choose.studioHourlyRowsForDisplay(rows).length,2,'Na próxima hora, agendamento normal é restaurado');

const code=section('async function confirmPromoReadV56(event){','async function confirmPromoRead(event){');
async function scenario(ok){
  const p={id:'PAUTA1',name:'PAUTA FICTÍCIA',readLog:[],readByHour:{}};
  const item={date:'2026-10-14',slot:'16H',program:'PROGRAMA'};
  let returns=0,alerts=[],writes=0;
  const button={dataset:{busy:'0'},disabled:false,textContent:'CONFIRMAR',classList:{contains:()=>false,add(){},remove(){}},setAttribute(){}};
  const cancel={disabled:false,setAttribute(){}};
  const ctx={
    console:{error(){}},alert:m=>alerts.push(m),$:id=>({'confirmPromoReadInline':button,'cancelPromoReadInline':cancel})[id]||null,
    currentPromoForRead:()=>p,currentDisplayItem:item,studioReadSaving:false,studioResultSaving:false,studioCampaignContext:null,studioPostReadPrizeHourKey:'',
    studioRequiredReadsForHour:()=>1,studioReadCountForHour:()=>0,studioMissedCountForHour:()=>0,
    studioOperatorIdentity:()=>({name:'TESTE',sector:'ESTÚDIO'}),
    ensureStudioFirebaseOnline:async()=>{},readHourKey:()=> 'KEY',studioRecordMonths:()=> ['2026-10'],studioOutcomeMonthKey:()=> '2026-10',
    todayISO:()=> '2026-10-14',studioRetry:fn=>fn(),studioAV57Logs:()=>[],validReadTimestamp:()=>'',hourMapValue:()=>'',
    window:{firebase:{database:{ServerValue:{TIMESTAMP:1}}}},STUDIO_STATION:'JP1017',pad:n=>String(n).padStart(2,'0'),
    formatStudioTime:v=>v,timeToHHMM:()=> '16:00',programFromSchedule:()=> 'PROGRAMA',upper:v=>String(v).toUpperCase(),
    pautaTypeLabel:()=> 'PAUTA',studioOpecTextType:()=> 'legacy',studioOpecVersion:()=> 1,
    firebaseRef:{
      child(){return this},
      async transaction(cb){if(!ok)throw new Error('FALHA SIMULADA');const list=cb([structuredClone(p)]);assert.equal(list[0].readLog.length,1);writes++;return {committed:true,snapshot:{val:()=>list}};},
      async update(){}
    },
    state:{months:{'2026-10':{promos:[]}}},selectedPromoId:'PAUTA1',studioReadSheetPromoId:'PAUTA1',
    appendStudioAudit:async()=>{},currentHourKey:()=> '2026-10-14-16-0',
    returnStudioToNow(){returns++;}
  };
  vm.createContext(ctx);vm.runInContext(code,ctx);
  await ctx.confirmPromoReadV56({preventDefault(){},stopPropagation(){},currentTarget:button});
  if(ok){
    assert.equal(writes,1,'Uma confirmação por clique');
    assert.equal(returns,1,'Só após salvar volta ao prêmio');
    assert.equal(ctx.studioPostReadPrizeHourKey,'2026-10-14-16-0');
    assert.equal(ctx.state.months['2026-10'].promos[0].readLog.length,1,'Histórico preservado');
    assert.equal(alerts.length,0,JSON.stringify(alerts));
  }else{
    assert.equal(returns,0,'Erro não deve fechar o texto antes de confirmar');
    assert.equal(ctx.studioPostReadPrizeHourKey,'');
    assert.equal(alerts.length,1,'Erro informado ao locutor');
  }
  assert.equal(ctx.studioReadSaving,false,'Trava de gravação liberada');
  assert.equal(button.disabled,false,'Botão restaurado');
}
(async()=>{await scenario(true);await scenario(false);console.log('PASS: AV58.1.18 retorno imediato ao prêmio, atualização da hora, falha de confirmação e remoção da faixa');})().catch(error=>{console.error(error);process.exitCode=1;});
