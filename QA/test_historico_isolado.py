#!/usr/bin/env python3
"""Executes the revised History results function inside Chromium with a synthetic DOM/store."""
import ast, pathlib, importlib.util
from playwright.sync_api import sync_playwright
BASE=pathlib.Path(__file__).resolve().parents[1]
module=ast.parse((BASE/'aplicar_em_checkout_local.py').read_text())
fn=next(x for x in module.body if isinstance(x,ast.FunctionDef) and x.name=='patch_passport')
code=None
for node in ast.walk(fn):
  if isinstance(node,ast.Call) and isinstance(node.func,ast.Name) and node.func.id=='replace_one':
    if len(node.args)>=3 and isinstance(node.args[2],ast.Constant) and isinstance(node.args[2].value,str) and 'RESULTADO INCOMPLETO' in node.args[2].value:
      code=node.args[2].value
assert code and code.startswith('function results(id)')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page()
 page.set_content('<div data-jp-result="P1" hidden></div>')
 page.evaluate(r'''
window.TEST={messages:[],calls:0};
window.promo={id:'P1',kind:'promo',name:'PROMO ENCERRADA',endDate:'2026-10-30',drawDate:'2026-10-28',drawTime:'10:00',occurrences:[{date:'2026-10-28',time:'10:00',qtyPlanned:2}],resultWinnersByHour:{'2026-10-28-1000':[{id:'A',name:'OUVINTE UM'}]}};
window.getPromo=id=>id==='P1'?promo:null;
window.note=(msg,bad)=>TEST.messages.push({msg,bad});
window.allResultRows=()=>[{source:'promo',id:'P1',date:'2026-10-28',occurrenceKey:'2026-10-28-1000',winnerIndex:0,result:'OUVINTE UM'}];
window.receptionCampaignWinnerHtml=r=>'<button data-winner-existing>'+r.result+'</button>';
window.receptionCampaignOccurrences=p=>[{pending:true,date:'2026-10-28',time:'10:00',winners:[{name:'OUVINTE UM'}],qtyPlanned:2}];
window.esc=x=>String(x||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
window.dateText=x=>x;
window.promoTitle=p=>p.name;
window.timeToHHMM=x=>x;
window.receptionPromosForDate=()=>[promo];
window.receptionAllPromos=()=>[promo];
window.distributionById=()=>({title:'PAR DE INGRESSOS'});
window.promoWinnerSourceRef=(p,d,t)=>'PROMO:'+p.id+':'+d+':'+t;
window.promoWinnerToken=x=>'W'+String(x).length;
window.promoWinnerNormalize=x=>x;
window.receptionOperatorIdentity=()=>({name:'QA'});
window.ensureReceptionOnline=async()=>{};
window.receptionWinnerBankRef={};window.firebaseRef={};
window.receptionRecordMonths=()=>['2026-10'];
window.state={months:{'2026-10':{promos:[promo]}}};
window.promoWinnerStore=async x=>{TEST.calls++;const updated={...promo,resultWinnersByHour:{'2026-10-28-1000':x.winners}};return{rows:[updated],monthKey:'2026-10'}};
window.render=()=>{};
window.showReceptionToast=(msg,bad)=>TEST.messages.push({msg,bad});
''')
 page.add_script_tag(content=code)
 page.add_script_tag(path=str(BASE/'assets/jp-reception-result-entry.js'))
 page.evaluate("results('P1')")
 assert page.locator('[data-winner-existing]').count()==1
 assert page.locator('[data-reception-create-winner]').count()==1
 page.fill('[data-reception-winner-name]','OUVINTE DOIS')
 page.click('[data-reception-create-winner]')
 page.wait_for_function('TEST.calls===1')
 page.wait_for_timeout(50)
 names=page.evaluate("state.months['2026-10'].promos[0].resultWinnersByHour['2026-10-28-1000'].map(x=>x.name)")
 assert names==['OUVINTE UM','OUVINTE DOIS'],names
 print('PASS Histórico de promoção encerrada permite incluir segundo ganhador no registro original')
 b.close()
