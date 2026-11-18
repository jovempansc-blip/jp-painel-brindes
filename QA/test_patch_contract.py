#!/usr/bin/env python3
"""Static contract of the strict patcher. Uses source-text fixtures, never Firebase."""
import ast, importlib.util, pathlib, tempfile, unittest
BASE=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('candidate',BASE/'aplicar_em_checkout_local.py')
candidate=importlib.util.module_from_spec(spec);spec.loader.exec_module(candidate)
module=ast.parse((BASE/'aplicar_em_checkout_local.py').read_text())

def anchors(fname):
    fn=next(x for x in module.body if isinstance(x,ast.FunctionDef) and x.name==fname)
    parts=[]
    for node in ast.walk(fn):
        if isinstance(node,ast.Call) and isinstance(node.func,ast.Name) and node.func.id=='replace_one':
            arg=node.args[1]
            if isinstance(arg,ast.Constant) and isinstance(arg.value,str):parts.append(arg.value)
    return parts

def fixture(name):
    supporting={'patch_receipt':['defer_result_requirements','fix_partial_status'],
     'patch_main':['defer_result_requirements','fix_partial_status'],
     'patch_studio':['defer_result_requirements','fix_partial_status']}.get(name,[])
    segments=[]
    for f in [name,*supporting]:
        for s in anchors(f):
            if s not in segments:segments.append(s)
    return '\n/* MOCK SEGMENT */\n'.join(segments)

class CandidateContract(unittest.TestCase):
    def test_reception(self):
        x=candidate.patch_receipt(fixture('patch_receipt'),'receipt')
        self.assertIn('inPeriod&&!ended',x)
        self.assertIn('data-reception-create-winner',x)
        self.assertIn('jp-reception-result-entry.js',x)
        self.assertIn("'PARCIAL'",x)
        self.assertIn('SALVAR / COMPLETAR DADOS',x)
    def test_history(self):
        x=candidate.patch_passport(fixture('patch_passport'),'passport')
        self.assertIn('return receptionActiveCampaigns',x)
        self.assertNotIn('isPinned(p.id)&&!ids.has(p.id)',x)
        self.assertIn('histórico permite entrada de ganhador ausente' if False else 'RESULTADO INCOMPLETO',x)
        self.assertIn('data-reception-create-winner',x)
    def test_studio_single(self):
        x=candidate.patch_studio(fixture('patch_studio'),'studio')
        self.assertIn("winners:[{name:''}]",x)
        self.assertIn('collectPromoWinnerInputs(false)',x)
        self.assertIn('enteredChecks',x)
        self.assertIn("'PARCIAL'",x)
    def test_distribution_entry(self):
        x=candidate.patch_main(fixture('patch_main'),'main')
        self.assertIn('openDistributionWinnerEntry',x)
        self.assertIn('jp-distribution-winner-entry.js',x)
    def test_offline_apply_and_backup(self):
        with tempfile.TemporaryDirectory() as temp:
            base=pathlib.Path(temp)
            specs=[('preview_recepcao.html','patch_receipt'),('assets/jp-reception-passport.js','patch_passport'),
                   ('painel_pauta_estudio_jovem_pan_GITHUB_API.html','patch_studio'),('index.html','patch_main')]
            for path,kind in specs:
                dest=base/path;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(fixture(kind))
            candidate.run(base,True)
            self.assertTrue((base/'assets/jp-reception-result-entry.js').is_file())
            self.assertTrue((base/'assets/jp-distribution-winner-entry.js').is_file())
            self.assertIn('openDistributionWinnerEntry',(base/'index.html').read_text())
            self.assertIn('SALVAR GANHADOR',(base/'preview_recepcao.html').read_text())
            for path,_ in specs:
                self.assertTrue((base/'.jp-backup-revisao-20261118'/path).is_file())
    def test_fails_closed_on_unknown_version(self):
        with self.assertRaises(RuntimeError):candidate.patch_studio('outdated version','studio')

if __name__=='__main__':unittest.main(verbosity=2)
