const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const variants=[{id:'OMR_TX_01',text:'Institucional A'},{id:'OMR_TX_02',text:'Institucional B'},{id:'OMR_TX_03',text:'Institucional C'}];
for(const filename of ['painel_pauta_estudio_jovem_pan_GITHUB_API.html','painel_pauta_estudio_jovem_pan_news.html']){
 const src=fs.readFileSync(path.join(root,filename),'utf8');
 const begin=src.indexOf('function studioPautaTextVariants(p)'),end=src.indexOf('function startPromoRead(',begin);
 assert(begin>0&&end>begin,'found rotation implementation');
 const record={id:'MERCHAN_TEST',kind:'merchan',textRotationEnabled:true,textVariants:variants,description:'Institucional A',readLog:[]};
 const ctx={state:{months:{'2026-10':{promos:[record]}}},studioAV57Logs:()=>[],studioAV57Progress:()=>({remaining:1}),todayISO:()=> '2026-10-19'};
 vm.createContext(ctx);vm.runInContext(src.slice(begin,end),ctx);
 assert.equal(ctx.studioPautaTextVariants(record).length,3,filename+': text rotation works for merchan');
 const item={date:'2026-10-19',slot:'10H'};
 assert.equal(ctx.studioPautaRotationChoice(record,item).text,'Institucional A');
 record.readLog.push({id:'R1',confirmedAt:'2026-10-19T10:05:00Z',textVariantId:'OMR_TX_01'});
 assert.equal(ctx.studioPautaRotationChoice(record,item).text,'Institucional B');
 record.readLog.push({id:'R2',confirmedAt:'2026-10-19T11:06:00Z',textVariantId:'OMR_TX_02'});
 assert.equal(ctx.studioPautaRotationChoice(record,item).text,'Institucional C');
 record.readLog.push({id:'R3',confirmedAt:'2026-10-19T12:05:00Z',textVariantId:'OMR_TX_03'});
 assert.equal(ctx.studioPautaRotationChoice(record,item).text,'Institucional A');
 ctx.state.months['2026-11']={promos:[{...record,readLog:[{id:'R4',confirmedAt:'2026-11-02T08:05:00Z',textVariantId:'OMR_TX_01'}]}]};
 ctx.state.months['2026-10'].promos[0].readLog.push({id:'R4',confirmedAt:'2026-11-02T08:05:00Z',textVariantId:'OMR_TX_01'}); // duplicated log across month copies
 assert.equal(ctx.studioPautaRotationCount(record,'2026-11',ctx.state.months['2026-11'].promos[0].readLog),4,'deduplicate across months');
 const disabled={...record,textRotationEnabled:false};assert.equal(ctx.studioPautaTextVariants(disabled).length,0);
 assert(src.includes('textSnapshot:rotationVersion?rotationVersion.text:'),'reads preserve text content');
}
const omr=fs.readFileSync(path.join(root,'merchan_radios.html'),'utf8');
for(const needle of [
 'id="opecTextRotationEnabled"','id="opecTextRotationAdd"','id="opecTextRotationList"',
 'textRotationEnabled:nextRotationEnabled,textVariants:nextTextVariants',
 'batch.map(async key=>','if(opecConnected&&!opecSaving)',
 'CONFIRMADO PELO FIREBASE','opecPublicationReceipt',
 'opecConnectionRef.on(\'value\'','AV57_4_SMART_BALANCE_V4'
]) assert(omr.includes(needle),needle);
console.log('PASS: OMR optional rotation, sequence, deduplication, history, UI controls, bounded month saves and connection states');
