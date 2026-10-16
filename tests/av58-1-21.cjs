const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('painel_pauta_estudio_jovem_pan_GITHUB_API.html','utf8');
const segment=(begin,end)=>{const from=html.indexOf(begin),to=html.indexOf(end,from+begin.length);assert(from>=0&&to>from,`Trecho não localizado: ${begin}`);return html.slice(from,to);};
assert.match(html,/class="titleBox studioReadingTitleBox"/,'A confirmação deve ficar dentro do cabeçalho da leitura');
assert.match(html,/id="confirmPromoReadInline"/);
assert.match(html,/class="studioReadingHeaderConfirm/);
assert.doesNotMatch(segment('<div class="pautaActions studioInlineReadActions"','` : isVirtual'),/id="confirmPromoReadInline"/,'A confirmação não pode continuar duplicada abaixo do texto');
assert.match(html,/\.studioReadingHeaderConfirm\{[\s\S]*?position:absolute;right:16px/,'O círculo deve ficar à direita do título');
assert.match(html,/#confirmPromoReadInline\.studioReadingHeaderConfirm\{[^}]*background:linear-gradient\(145deg,#3bbe77,#168b50\)!important/,'Verde deve prevalecer sobre regras legadas vermelhas');
assert.match(html,/\.studioSideRailName\{[\s\S]*?-webkit-line-clamp:2/,'Nomes com até duas linhas');
assert.match(html,/\.studioSideRailCard\.read \.studioSideRailTickerTrack\{[^}]*2\.8s/,'Letreiro vertical deve alternar rapidamente');
assert.match(html,/@keyframes studioReadVerticalTickerV21\{/);
assert.doesNotMatch(html,/id="studioReadingDueBanner"/,'Faixa inferior vermelha continua removida');

// Sorting depends on actual read state; never sort all rows green before orange.
const sorter=segment('function studioSideRailEntries(kind,item){','function studioToggleSideRail(kind)');
const ctx={
  currentDisplayItem:null, studioCurrentReadItem:()=>({date:'2026-10-15',slot:'08H'}),
  merchansForItemHour:()=>[],promosForItemHour:()=>[
    {id:'READ',name:'JÁ LIDA'}, {id:'PENDING',name:'AINDA NÃO LIDA'}, {id:'MISSED',name:'NÃO REALIZADA'}
  ],
  studioAV57Progress:p=>({remaining:p.id==='PENDING'?1:0,missed:p.id==='MISSED'?1:0}),
  studioSideRailName:p=>p.name,
};
vm.createContext(ctx);vm.runInContext(sorter,ctx);
assert.deepEqual([...ctx.studioSideRailEntries('promo',{date:'2026-10-15',slot:'08H'}).rows].map(r=>r.p.id),['PENDING','READ','MISSED']);
// Read ticker must show name then actual saved read time, not scheduled time.
const card=segment('function studioSideRailCardMarkup(kind,p,item){','function renderStudioSideRail(kind,item){');
const cardCtx={studioAV57Progress:p=>({remaining:p.id==='READ'?0:1,missed:0}),studioSideRailName:p=>p.name,
  esc:v=>String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;'),readTimeLabel:()=> 'FEITA 08H14',readTimestampForHour:()=> '2026-10-15T08:14:00Z'};
vm.createContext(cardCtx);vm.runInContext(card,cardCtx);
const done=cardCtx.studioSideRailCardMarkup('promo',{id:'READ',name:'PROMOÇÃO DE TESTE'},{});
const pending=cardCtx.studioSideRailCardMarkup('promo',{id:'PENDING',name:'PAUTA LONGA'},{});
assert.match(done,/studioSideRailCard read/);
assert.match(done,/PROMOÇÃO DE TESTE/);assert.match(done,/LIDO 08H14/);
assert.match(pending,/studioSideRailCard pending/);assert.doesNotMatch(pending,/(?:08H|PENDENTE)/);

// The changed green button preserves its icon while saving and only returns after ack.
const confirm=segment('async function confirmPromoReadV56(event){','async function confirmPromoRead(event){');
async function checkSaved(success){
  const p={id:'ID1',name:'TESTE',readLog:[],readByHour:{}};
  const item={date:'2026-10-15',slot:'08H',program:'ROCK N POP'};
  const classes=new Set(['studioReadingHeaderConfirm']);
  const button={dataset:{busy:'0'},disabled:false,textContent:'✓',attributes:{},classList:{contains:c=>classes.has(c),add:c=>classes.add(c),remove:c=>classes.delete(c)},setAttribute(k,v){this.attributes[k]=v;}};
  const cancel={disabled:false,setAttribute(){}};
  let returns=0,alerts=[];
  const sb={
    console:{error(){}},alert:x=>alerts.push(x),$:id=>({'confirmPromoReadInline':button,'cancelPromoReadInline':cancel})[id]||null,
    currentPromoForRead:()=>p,currentDisplayItem:item,studioReadSaving:false,studioResultSaving:false,studioCampaignContext:null,studioPostReadPrizeHourKey:'',
    studioRequiredReadsForHour:()=>1,studioReadCountForHour:()=>0,studioMissedCountForHour:()=>0,studioOperatorIdentity:()=>({name:'OPERADOR',sector:'ESTÚDIO'}),
    ensureStudioFirebaseOnline:async()=>{},readHourKey:()=> 'KEY',studioRecordMonths:()=> ['2026-10'],studioOutcomeMonthKey:()=> '2026-10',
    todayISO:()=> '2026-10-15',studioRetry:fn=>fn(),studioAV57Logs:()=>[],validReadTimestamp:()=>'',hourMapValue:()=>'',
    window:{firebase:{database:{ServerValue:{TIMESTAMP:1}}}},STUDIO_STATION:'JP1017',pad:n=>String(n).padStart(2,'0'),
    formatStudioTime:v=>v,timeToHHMM:()=> '08:00',programFromSchedule:()=> 'ROCK N POP',upper:v=>String(v).toUpperCase(),
    pautaTypeLabel:()=> 'PAUTA',studioOpecTextType:()=> 'legacy',studioOpecVersion:()=> 1,
    firebaseRef:{child(){return this},async transaction(cb){if(!success)throw Error('FALHA DE TESTE');const changed=cb([structuredClone(p)]);return {committed:true,snapshot:{val:()=>changed}};},async update(){}},
    state:{months:{'2026-10':{promos:[]}}},appendStudioAudit:async()=>{},currentHourKey:()=> '2026-10-15-08-0',returnStudioToNow(){returns++;}
  };
  vm.createContext(sb);vm.runInContext(confirm,sb);
  await sb.confirmPromoReadV56({preventDefault(){},stopPropagation(){},currentTarget:button});
  assert.equal(button.textContent,'✓','Confirmar no cabeçalho não pode substituir ícone por texto');
  assert.equal(button.disabled,false,'Após término, botão fica utilizável');
  assert.equal(button.attributes['aria-label'],'CONFIRMAR LEITURA');
  assert.equal(returns,success?1:0,'Só sai após confirmação do Firebase');
  assert.equal(alerts.length,success?0:1,'Falha mostra alerta e conserva texto');
}
(async()=>{await checkSaved(true);await checkSaved(false);console.log('PASS: AV58.1.21 cabeçalho, filas, duas linhas, letreiro, sucesso e falha simulados');})().catch(e=>{console.error(e);process.exitCode=1});
