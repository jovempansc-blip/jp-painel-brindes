#!/usr/bin/env python3
"""Tests exact replacement expressions shipped by QA2 patcher, no Firebase network."""
import ast,pathlib,json,subprocess
p=pathlib.Path(__file__).resolve().parents[1]/'aplicar_em_checkout_local.py'
mod=ast.parse(p.read_text())
def replacements(fn):
  node=next(x for x in mod.body if isinstance(x,ast.FunctionDef) and x.name==fn)
  return [(x.args[1].value,x.args[2].value) for x in ast.walk(node) if isinstance(x,ast.Call) and isinstance(x.func,ast.Name) and x.func.id=='replace_one' and len(x.args)>2 and isinstance(x.args[1],ast.Constant) and isinstance(x.args[2],ast.Constant) and isinstance(x.args[1].value,str)]
rs=replacements('patch_receipt'); ps=replacements('patch_passport');rules=replacements('defer_result_requirements')
state=next(a for b,a in rs if 'const ended=!!p.opecForceEnded' in a)
history=next(a for b,a in ps if a.startswith('const historyEligible='))
active=next(a for b,a in ps if a.startswith('function active(rows)'))
required=next(a for b,a in rules if "required=(stage==='pickup'" in a)
js=f'''
const assert=require('node:assert/strict');
const info=[];
global.receptionCampaignVisible=()=>true;
const run=new Function('p','date','const occurrences=[];const winners=[];const pending=[];const allDone=true;'+
  'const end=p.endDate||p.drawDate||p.startDate||"",start=p.startDate||p.drawDate||"";'+
  'const inPeriod=(!start||start<=date)&&(!end||end>=date);'+
  'const hasDueResult=false;'+
  'const nonOperational=!!p.opecArchived||!!p.opecForceEnded||String(p.opecPublicationStatus||"published").toLowerCase()==="draft";'+
  {json.dumps(state)} );
const when='2026-11-18';
const tests=[
 ['vigente',{{startDate:'2026-11-01',endDate:'2026-11-20'}},true],
 ['encerrou ontem',{{startDate:'2026-11-01',endDate:'2026-11-17'}},false],
 ['encerra hoje',{{startDate:'2026-11-01',endDate:'2026-11-18'}},true],
 ['futura',{{startDate:'2026-11-19',endDate:'2026-11-30'}},false],
 ['arquivada ainda no prazo',{{startDate:'2026-11-01',endDate:'2026-11-20',opecArchived:true}},false],
 ['encerramento forçado',{{startDate:'2026-11-01',endDate:'2026-11-20',opecForceEnded:true}},false],
 ];
for(const [title,p,expected] of tests){{const actual=run(p,when).visible;assert.equal(actual,expected,title);info.push(title);}}
const todayISO=()=>when;
{history}
for(const [title,p,expected] of [
 ['histórico encerrado ontem',{{endDate:'2026-11-17'}},true],
 ['histórico fim hoje',{{endDate:'2026-11-18'}},false],
 ['histórico arquivada',{{endDate:'2026-11-25',opecArchived:true}},true],
]) {{assert.equal(historyEligible(p),expected,title);info.push(title);}}
const originalGroups=[{{p:{{kind:'promo',id:'A',endDate:'2026-11-17'}},inPeriod:false,ended:true}},{{p:{{kind:'promo',id:'B',endDate:'2026-11-20'}},inPeriod:true,ended:false}}];
const receptionActiveCampaigns=()=>originalGroups;const isPassport=()=>false;
{active}
assert.deepEqual(active([]).map(x=>x.p.id),['B']);info.push('fixada encerrada não vaza para promoções');
function required(stage,mode,key,prefix){{{required.replace('const mode=fields[key],value=String(data[key]||\'\').trim(),required=','return ').replace(';',';')}}}
const checks=[['result','result','name','',true],['result','result','phone','',false],['pickup','result','phone','',true],['result','result','name','ACOMPANHANTE 1',false],['pickup','result','name','ACOMPANHANTE 1',true]];
for(const [stage,mode,key,prefix,expected] of checks){{assert.equal(required(stage,mode,key,prefix),expected);info.push('validação '+[stage,mode,key,prefix].join('/'));}}
console.log(JSON.stringify({{total:info.length,tests:info}},null,2));
'''
out=pathlib.Path(__file__).with_name('test_regras_gerado.cjs')
out.write_text(js)
r=subprocess.run(['node',str(out)],text=True,capture_output=True)
print(r.stdout,r.stderr);raise SystemExit(r.returncode)
