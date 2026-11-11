from pathlib import Path
from html.parser import HTMLParser
import re

root=Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text()
js=(root/'assets/jp-dist-editor-v2.js').read_text()
css=(root/'assets/jp-dist-editor-v2.css').read_text()
checks=[]
def check(label,condition):
    assert condition,label
    checks.append(label)
    print('PASS',len(checks),label)
class IdParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if a.get('id'):
            self.ids.append(a['id'])
parser=IdParser()
parser.feed(html)
form=html.split('<form id="distForm">',1)[1].split('</form>',1)[0] if '<form id="distForm">' in html else ''
form_ids=set(re.findall(r'\bid="([^"]+)"',form))
required={
 'distDate','distShow','distEventMode','distEventVersions',
 'distStartDate','distEndDate','distPrize','distTitle','distDescription',
 'distTotal','distMasterStockField','distStockReceiveField','distStockAdjustmentField','distStockHistoryField',
 'distPrizeType','distTicketDefaultUnit','distPairsPreview','distMonthlyStockOverview',
 'distConversionSummary','distDestList','distRotationHours'
}
check('o formulário de distribuição continua presente',bool(form))
check('a estrutura original da ficha existe antes da reorganização', '<div class="formGrid">' in form)
check('o novo editor carrega após o script operacional',html.rfind('assets/jp-dist-editor-v2.js')>html.index('</script>',html.index('function saveDistributionFromForm')))
check('a folha de estilo é carregada no head',html.index('assets/jp-dist-editor-v2.css')<html.index('</head>'))
check('não existem IDs duplicados',len(parser.ids)==len(set(parser.ids)))
check('os 21 blocos de referência permanecem no formulário',required.issubset(form_ids))
check('todos os blocos têm encaminhamento para a ficha nova',all(id in js for id in required))
for id in sorted(required):
    check('campo original preservado: '+id,id in form_ids)
check('histórico permanece diretamente visível','move("distStockHistoryField",history)' in js)
check('estorno auditado existente continua acessível','data-stock-reverse' in html and 'reverseDistributionStockAddition' in html)
check('eventos com datas continuam editáveis','move("distEventMode",event)' in js and 'event.append(versions)' in js)
check('rodízio inteligente permanece disponível','move("distRotationHours",scheduling)' in js)
check('estilos de título e descrição foram preservados',all(id in form_ids for id in ['distTitleFont','distTitleSize','distTitleColor','distDescFont','distDescSize','distDescColor']))
check('salvar continua sendo o submit nativo','<button class="btn red" type="submit">' in form)
check('há leitura do Firebase antes e depois da gravação','await verifyDistributionBeforeSave(d.id)' in html and 'await hotfixVerifyPrizeWrite(d.id)' in html)
check('há feedback e recuperação após erro','window.JPDistEditor?.status(' in html and 'rollbackToFirebaseBaseline' in html)
patterns=re.findall(r'([^{}]+)\{[^{}]*\}',re.sub(r'/\*[\s\S]*?\*/','',css))
check('CSS é restrito à ficha e ao status da Distribuição',all('#distDrawer' in rule or '#view-distribuicao' in rule for rule in patterns if rule.strip() and not rule.strip().startswith('@') and 'from' not in rule))
print('EDITOR_LAYOUT_QA',len(checks),'PASS 0 FAIL','BLOCOS_ORIGINAIS',len(required))

