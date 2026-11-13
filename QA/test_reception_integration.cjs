const A=require('node:assert/strict');
const fs=require('node:fs'),P=require('node:path'),vm=require('node:vm');
const root=P.resolve(__dirname,'..');
const read=x=>fs.readFileSync(P.join(root,x),'utf8');
let n=0;const check=(title,fn)=>{fn();console.log('PASS',++n,title)};
const index=read('index.html'),rec=read('preview_recepcao.html'),js=read('assets/jp-reception-passport.js'),css=read('assets/jp-reception-passport.css'),core=read('assets/jp-passport-core.js');
check('logo oficial mantida',()=>A(rec.includes('assets/logo-workspace-jp.png')));
check('cabeçalho oficial mantido',()=>A(rec.includes('class="receptionUnifiedHeader"')));
check('seção original de resultados mantida',()=>A(rec.includes('id="receptionCampaignList"')));
check('cards de retirada originais preservados',()=>A(rec.includes('class="resultCard')));
check('guia nativa recebe Fixadas, Histórico e Passaportes',()=>{
 A(js.includes("'ativas','fixadas','historico','passaportes'"));
 A(js.includes('data-jp-tab'));
});
check('botão direito oferece fixação',()=>A(js.includes("addEventListener('contextmenu'")));
check('menu ⋮ acessível por clique',()=>A(js.includes('data-jp-menu')));
check('fixação persistente utiliza Firebase em vez de localStorage',()=>{
 A(js.includes("child('receptionCampaignPins')"));
 A(!js.includes('localStorage.setItem'));
});
check('desafixação preserva histórico na mesma transação',()=>{
 A(js.includes("action:wanted?'PIN':'UNPIN'"));
 A(js.includes('history:[...history'));
 A(!js.includes("transaction(old=>wanted?{pinned:true"));
});
check('resultados históricos permanecem após retirada concluída',()=>{
 A(rec.includes('displayWinners=pinned?g.winners:g.pending'));
 A(rec.includes('displayWinners.map(receptionCampaignWinnerHtml)'));
});
check('não exibe retirada pendente indevidamente quando campanha encerrou',()=>A(rec.includes('ENCERRADA · HISTÓRICO DISPONÍVEL')));
check('campos proporcionais no desktop',()=>{
 A(css.includes('minmax(120px,150px)'));
 A(css.includes('minmax(140px,170px)'));
 A(css.includes('@media(max-width:650px)'));
});
check('atalho aparece no cadastro oficial da promoção',()=>A(index.includes('id="jpPromoPassportShortcut"')));
check('atalho exige salvar antes de configurar',()=>A(index.includes('SALVE PRIMEIRO A PROMOÇÃO')));
check('link usa ID oficial da promoção',()=>A(index.includes('passaporte=')));
check('relação com evento exige identificador e competência',()=>{
 A(js.includes('monthKey:e.month'));A(js.includes('distributionId:e.d.id'));
});
check('reserva individual é selecionável',()=>A(js.includes('id="jpRcpReservation"')));
check('quantidade está em unidades físicas',()=>A(js.includes('UNIDADES FÍSICAS')));
check('CPF permanece fora da árvore pública',()=>{
 A(js.includes("const privatePath='jp-painel-brindes/passportPrivate'"));
 A(!js.includes('current.passportCampaigns[key].cpf'));
});
check('regra de acesso do Firebase bloqueia por padrão',()=>{
 A(js.includes('window.JP_PASSPORT_PRIVATE_RULES_HOMOLOGATED===true'));
 A(js.includes('window.JP_PASSPORT_METADATA_RULES_HOMOLOGATED===true'));
 A(!index.includes('JP_PASSPORT_PRIVATE_RULES_HOMOLOGATED=true'));
});
check('autenticação exige claim de recepção ou administrador',()=>{
 A(js.includes('getIdTokenResult(true)'));
 A(js.includes('claims.jpReception'));
 A(js.includes('claims.jpAdmin'));
});
check('transferência é explicitamente autorizada por campanha',()=>{
 A(js.includes('id="jpRcpTransfer"'));
 A(js.includes('!where.cfg.allowTransfer'));
});
check('cadastro nominal utiliza atualização atômica com auditoria no mesmo nó',()=>{
 A(js.includes('recordRef.transaction('));
 A(js.includes('current.tickets='));
 A(js.includes('current.audit='));
});
check('controle de versão impede gravação obsoleta em outro PC',()=>A(js.includes('latest.revision')||js.includes('remote?.revision')||js.includes('latest.revision||0')));
check('baixa rejeita ingresso utilizado anteriormente',()=>A(js.includes("latest.status==='UTILIZADO'")));
check('resultado do sorteio original não é regravado',()=>A(!js.includes('resultWinnersByHour=')));
check('consulta do vínculo é refeita antes de salvar beneficiário',()=>A(js.includes("root().child('passportCampaigns').child(encode(selected)).get()")));
check('ficha privada observa alterações em outros computadores',()=>A(js.includes("ref.on('value',snap=>")));
check('listener privado é desconectado ao fechar a ficha',()=>A(js.includes("privateListener.off('value')")));
check('guard da Distribuição Geral incluído no salvamento',()=>{
 A(index.includes('JPPassportDistributionGuard.verify'));
 A(index.includes('assets/jp-passport-distribution-guard.js'));
});
check('código original da Promo Externa preservado sem alterações',()=>{
 A(!rec.includes('PROMOÇÃO EXTERNA BLOQUEADA PARA PROTEÇÃO DOS DADOS PESSOAIS'));
});
console.log('RECEPCAO INTEGRACAO',n,'PASS 0 FAIL');

