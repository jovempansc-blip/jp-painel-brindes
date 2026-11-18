#!/usr/bin/env python3
"""Browser QA of the two new UI modules against a synthetic in-memory store.
No external requests or Firebase production access. Not end-to-end certification.
"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json, traceback
ASSETS=Path(__file__).resolve().parents[1]/'assets'
RECEP_JS=ASSETS/'jp-reception-result-entry.js'
DIST_JS=ASSETS/'jp-distribution-winner-entry.js'
results=[]

def check(name, fn):
    try:
        fn(); results.append((name,'PASS',''))
    except Exception as e:
        results.append((name,'FAIL',str(e))); traceback.print_exc()

def wait(page): page.wait_for_timeout(70)

COMMON = r"""
window.JPTEST={writeCount:0, saved:[], alerts:[], renderCount:0, lastToast:'', lastError:false,
    fail:false, wrongReturn:false, uploads:[], operatorCount:0, online:true};
window.timeToHHMM=x=>String(x).match(/\d\d:\d\d/)?.[0]||'20:30';
window.promoWinnerToken=x=>String(x||'').length+'AAA';
window.promoWinnerSourceRef=(p,d,t)=>'PROMO:'+p.id+':'+d+':'+t;
window.promoWinnerNormalize=(x,p)=>({...x,registrationRules:p.winnerRegistration||null});
window.promoWinnerStore=async function(opts){
  JPTEST.writeCount++;
  if(JPTEST.fail) throw Error('FIREBASE SIMULADO REJEITOU A GRAVAÇÃO');
  const seen=new Set(), checked=[];
  for(const w of opts.winners){
    const name=String(w.name||'').toUpperCase().trim();
    if(seen.has(name))throw Error('GANHADOR DUPLICADO');
    seen.add(name);
    checked.push(w);
  }
  const orig=state.months['2026-11']?.promos?.find(x=>x.id===opts.promo.id)||state.months['2026-10']?.promos?.find(x=>x.id===opts.promo.id);
  const count=opts.promo.occurrences[0].qtyPlanned;
  if(checked.length>count)throw Error('CAPACIDADE ESGOTADA');
  if(JPTEST.wrongReturn) return {rows:[opts.promo],monthKey:'2026-11'};
  const row={...opts.promo,resultWinnersByHour:{...(opts.promo.resultWinnersByHour||{}),[opts.occurrenceKey]:checked}};
  const month=(state.months['2026-11']?.promos||[]).some(x=>x.id===row.id)?'2026-11':'2026-10';
  JPTEST.saved.push({id:row.id,key:opts.occurrenceKey,names:checked.map(w=>w.name),month});
  return {rows:[row],monthKey:month};
};
"""
RECEP = r"""
window.JPTEST_P={id:'PROMO1',kind:'promo',name:'PROMO TESTE',distributionId:'D1',drawDate:'2026-11-16',drawTime:'20:30',occurrences:[{date:'2026-11-16',time:'20:30',qtyPlanned:3}],winnerRegistration:{},resultWinnersByHour:{}};
window.state={months:{'2026-11':{promos:[JPTEST_P]}}};
window.receptionPromosForDate=()=>[JPTEST_P];
window.receptionAllPromos=()=>[JPTEST_P];
window.distributionById=id=>({id,title:'PRÊMIO SINTÉTICO'});
window.receptionOperatorIdentity=()=>({name:'QA ISOLADO',sector:'TESTE'});
window.receptionRecordMonths=()=>['2026-11'];
window.receptionWinnerBankRef={kind:'fake'};
window.firebaseRef={kind:'fake'};
window.ensureReceptionOnline=async()=>{if(!JPTEST.online)throw Error('FIREBASE OFFLINE');};
window.render=()=>{JPTEST.renderCount++};
window.showReceptionToast=(msg,error=false)=>{JPTEST.lastToast=msg;JPTEST.lastError=error};
"""
DIST = r"""
window.JPTEST_P={id:'PROMO1',kind:'promo',name:'PROMO ATUAL',distributionId:'D1',drawDate:'2026-11-16',drawTime:'20:30',occurrences:[{date:'2026-11-16',time:'20:30',qtyPlanned:3}],winnerRegistration:{},resultWinnersByHour:{}};
window.JPTEST_H={id:'HIST1',kind:'promo',name:'PROMO HISTÓRICA',distributionId:'DH',drawDate:'2026-10-05',drawTime:'10:00',occurrences:[{date:'2026-10-05',time:'10:00',qtyPlanned:1}],winnerRegistration:{},resultWinnersByHour:{}};
window.state={months:{'2026-10':{promos:[JPTEST_H]},'2026-11':{promos:[JPTEST_P]}}};
window.fullHourTimeValue=x=>x||'';
window.winnerPromoMapKeys=(date,time)=>[date+'-'+time.replace(':','')];
window.promoWinnerSourceRef=(p,d,t)=>'PROMO:'+p.id+':'+d+':'+t;
window.winnerStateRootRef=()=>({kind:'fake'});
window.winnerBankRef={kind:'fake'};
window.promptOperatorIdentity=()=>{JPTEST.operatorCount++;return {name:'QA ISOLADO',sector:'TESTE'}};
window.firebaseConnected=true;window.firebaseServerLoaded=true;
window.renderDistribuicao=()=>{JPTEST.renderCount++};
window.toast=msg=>{JPTEST.lastToast=msg};
window.initWinnerBank=()=>{};
window.alert=msg=>JPTEST.alerts.push(msg);
"""

def initialize(page,mode):
    page.set_content('<html><body>'+('''<div class="campaignWinnerEmpty"><input data-reception-winner-name value="OUVINTE FICTÍCIO"><input data-reception-winner-phone value=""><button data-reception-create-winner="PROMO1" data-reception-date="2026-11-16" data-reception-time="20:30">SALVAR GANHADOR</button></div>''' if mode=='reception' else '')+'</body></html>')
    page.evaluate(COMMON+(RECEP if mode=='reception' else DIST))
    page.add_script_tag(path=str(RECEP_JS if mode=='reception' else DIST_JS))

with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  def fresh(mode):
      page=browser.new_page(); initialize(page,mode);return page
  def recep_success():
      page=fresh('reception');page.click('[data-reception-create-winner]');page.wait_for_function('JPTEST.writeCount===1');wait(page)
      a=page.evaluate('JPTEST');assert a['lastError']==False,a; assert a['saved'][0]['names']==['OUVINTE FICTÍCIO'],a
      assert a['renderCount']>=1,a;page.close()
  check('Recepção: cadastro de um nome e confirmação visual',recep_success)
  def recep_optional():
      page=fresh('reception');page.locator('[data-reception-winner-phone]').fill('');page.click('[data-reception-create-winner]');page.wait_for_function('JPTEST.writeCount===1');assert page.evaluate('JPTEST.lastError')==False;page.close()
  check('Recepção: telefone pode ser incluído depois',recep_optional)
  def recep_missing():
      page=fresh('reception');page.locator('[data-reception-winner-name]').fill('');page.click('[data-reception-create-winner]');wait(page)
      assert page.evaluate('JPTEST.writeCount')==0; assert page.evaluate('JPTEST.lastError')==True;page.close()
  check('Recepção: não grava nome vazio',recep_missing)
  def recep_offline():
      page=fresh('reception');page.evaluate('JPTEST.online=false');page.click('[data-reception-create-winner]');wait(page)
      assert page.evaluate('JPTEST.writeCount')==0;assert page.evaluate('JPTEST.lastError')==True;page.close()
  check('Recepção: offline não indica sucesso',recep_offline)
  def recep_fail():
      page=fresh('reception');page.evaluate('JPTEST.fail=true');page.click('[data-reception-create-winner]');page.wait_for_function('JPTEST.writeCount===1');wait(page)
      assert page.evaluate('JPTEST.lastError')==True;page.close()
  check('Recepção: rejeição simulada não indica sucesso',recep_fail)
  def recep_mismatch():
      page=fresh('reception');page.evaluate('JPTEST.wrongReturn=true');page.click('[data-reception-create-winner]');page.wait_for_function('JPTEST.writeCount===1');wait(page)
      assert page.evaluate('JPTEST.lastError')==True;page.close()
  check('Recepção: recusa resposta sem nome persistido',recep_mismatch)
  def dist_open():
      page=fresh('distribution');page.evaluate("openDistributionWinnerEntry('D1')");assert page.locator('#jpDistWinnerOverlay').count()==1
      assert page.locator('#jpDistWinnerPromo option').count()==2;assert page.locator('#jpDistWinnerPromo').input_value()=='1';page.close()
  check('Distribuição: abre modal e seleciona prêmio vinculado',dist_open)
  def dist_success():
      page=fresh('distribution');page.evaluate("openDistributionWinnerEntry('D1')");page.fill('#jpDistWinnerName','OUVINTE FICTÍCIO');page.click('#jpDistWinnerSave');page.wait_for_function('JPTEST.writeCount===1');wait(page)
      a=page.evaluate('JPTEST');assert a['saved'][0]['id']=='PROMO1',a;assert a['lastToast'].startswith('GANHADOR REGISTRADO'),a
      assert page.locator('#jpDistWinnerOverlay').count()==0;page.close()
  check('Distribuição: salva ocorrência selecionada em memória sintética',dist_success)
  def dist_history():
      page=fresh('distribution');page.evaluate("openDistributionWinnerEntry('DH')"); assert page.locator('#jpDistWinnerPromo').input_value()=='0'
      page.fill('#jpDistWinnerName','PESSOA FICTÍCIA');page.click('#jpDistWinnerSave');page.wait_for_function('JPTEST.writeCount===1');wait(page)
      assert page.evaluate('JPTEST.saved[0].month')=='2026-10';page.close()
  check('Distribuição: aceita promoção de competência anterior',dist_history)
  def dist_bad_name():
      page=fresh('distribution');page.evaluate("openDistributionWinnerEntry('D1')");page.fill('#jpDistWinnerName','APELIDO');page.click('#jpDistWinnerSave');wait(page)
      assert page.evaluate('JPTEST.writeCount')==0;assert 'NOME E SOBRENOME' in page.locator('#jpDistWinnerFeedback').text_content();page.close()
  check('Distribuição: bloqueia cadastro com nome incompleto',dist_bad_name)
  def dist_offline():
      page=fresh('distribution');page.evaluate("openDistributionWinnerEntry('D1');firebaseConnected=false");page.fill('#jpDistWinnerName','PESSOA TESTE');page.click('#jpDistWinnerSave');wait(page)
      assert page.evaluate('JPTEST.writeCount')==0;assert 'INDISPONÍVEL' in page.locator('#jpDistWinnerFeedback').text_content();page.close()
  check('Distribuição: offline não grava nem indica sucesso',dist_offline)
  def dist_fail():
      page=fresh('distribution');page.evaluate("openDistributionWinnerEntry('D1');JPTEST.fail=true");page.fill('#jpDistWinnerName','PESSOA TESTE');page.click('#jpDistWinnerSave');page.wait_for_function('JPTEST.writeCount===1');wait(page)
      assert 'NÃO CONFIRMADA' in page.locator('#jpDistWinnerFeedback').text_content();assert page.locator('#jpDistWinnerOverlay').count()==1;page.close()
  check('Distribuição: rejeição simulada preserva o formulário',dist_fail)
  browser.close()

print(json.dumps([{'test':name,'status':status,'detail':detail} for name,status,detail in results],ensure_ascii=False,indent=2))
failed=[x for x in results if x[1]=='FAIL']
print('SIMULAÇÃO NAVEGADOR:',len(results)-len(failed),'PASS,',len(failed),'FAIL')
raise SystemExit(0 if not failed else 1)
