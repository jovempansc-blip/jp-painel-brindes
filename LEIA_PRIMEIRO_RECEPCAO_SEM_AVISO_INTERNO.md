JP WORKSPACE - RECEPCAO: SITUACAO 1 - AVISO TECNICO OCULTO

STATUS: CANDIDATO ISOLADO - NAO PUBLICADO NO GITHUB.

ESCOPO: preview_recepcao.html; assets/jp-promo-externa-reception-bridge.js; QA/test_reception_internal_notice.cjs.

Se a integracao Promo Externa estiver bloqueada, a secao fica inteiramente invisivel na Recepcao, sem mensagem interna. Se nao houver registros pendentes filtrados, a secao tambem nao ocupa espaco. O bloqueio de seguranca continua exigindo JP_EXT_SECURE_BANK_VERIFIED igual a true. Nenhum acesso ao Firebase e liberado, nem dado pessoal exposto.

SITUACAO 2: fixadas, historico e passaporte multieventos continuam em prototipo isolado; nao fazem parte deste pacote.

QA isolado: 3/3 aprovado. QA no navegador e teste de seguranca no ambiente oficial pendentes.

ROLLBACK: restaura os dois arquivos originais da revisao 06c952555baacb0ffe8196a1ad772739afb55465.

PUBLICACAO: exige aprovacao especifica do Board.
