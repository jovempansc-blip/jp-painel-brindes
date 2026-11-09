const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const engine=require('./return-balance.js');
const code=html.slice(html.indexOf('const RETURN_TRANSFER_SEGMENTS='),html.indexOf('function returnCountsByDistribution(){'));
const clone=x=>JSON.parse(JSON.stringify(x));
const num=x=>Math.max(0,Number(x)||0);
const distribution={id:'D1',total:10,campaignStockTotal:10,ar:5,app:0,camarote:0,camarim:0,rua:0,rs:0,ticketDefaultUnit:'pair',ticketUnits:{ar:'pair',app:'unit',camarote:'pair'},startDate:'2026-11-01',endDate:'2026-11-30'};
const item={id:'I1',date:'2026-11-02',slot:'09H',channel:'RÁDIO',sourceType:'manual',distributionId:'D1',qty:1,status:'REALIZADO',winnerName:'TESTE FICTÍCIO',reuseStatus:'sobra'};
const m={distributions:[clone(distribution)],items:[clone(item)],promos:[]};
const ctx={state:{currentMonth:'2026-11'},JPReturnBalance:engine,clone,num,Date,Math,Set,Object,Array,Number,JSON,String,Error,Promise,window:{},ticketUnit:(d,k)=>d.ticketUnits?.[k]||d.ticketDefaultUnit||'unit',allocated:d=>d.ar*2+d.app+d.camarote*2,distributionCampaignMasterTotal:d=>num(d.campaignStockTotal),todayISO:()=> '2026-11-09'};
vm.createContext(ctx);vm.runInContext(code,ctx);
const before=engine.compute({month:m,distribution:m.distributions[0],monthKey:'2026-11',today:'2026-11-09'});
const transfer=vm.runInContext('applyReturnTransferToMonth',ctx);
transfer(m,{kind:'item',itemId:'I1',winnerIndex:0,winnerCount:1,winner:'TESTE FICTÍCIO',monthKey:'2026-11',distributionId:'D1',status:'sobra'},'app','TR_RED_TEAM','2026-11-09T10:00:00Z');
const after=engine.compute({month:m,distribution:m.distributions[0],monthKey:'2026-11',today:'2026-11-09'});
console.log('CREDIT_BEFORE',before.credits,'CREDIT_AFTER_TRANSFER',after.credits,'FREE_RADIO_AFTER',after.available,'RADIO_QUOTA_AFTER',m.distributions[0].ar,'PROGRAMMED',after.programmed);
if(after.credits!==0){console.log('RED_TEAM_FAIL: physically transferred return remains counted as reusable radio credit');process.exitCode=1;}
