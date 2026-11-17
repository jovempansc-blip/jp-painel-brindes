# Hotfix — recuperação do painel principal / Distribuição Geral
Data: 17/11/2026.
Base: c6f1e2b3d1d4efa2427e5c189711d3c20b341064.
Sintoma: a página abre com "Nenhuma distribuição encontrada" apesar de existirem 8 distribuições de novembro, 6 ativas.

Diagnóstico read-only: a raiz /jp-painel-brindes/state possui aproximadamente 33,4 MB, com auditLog ~16,8 MB; o bootstrap antigo utilizava GET na raiz e timeout de 9 segundos. Algumas coleções de promoções têm posições null após remoções, o que pode interromper normalização se não forem filtradas.

Correção publicada somente em index.html:
- Preview de Distribuição Geral de novembro lido diretamente de /months/2026-11/distributions; é SOMENTE CONSULTA durante a sincronização, sem edição.
- Leitura integral segmentada da raiz por nós, incluindo months e auditLog, sem corrida de timeout de 9s.
- Uma única operação de bootstrap por sessão; no pós-carregamento, reconexão usa um probe leve em savedAt.
- Filtra lacunas null em itens, promoções e distribuições exclusivamente em memória antes de aplicar normalização.
- Estado oficial/baseline só fica pronto depois de todo o carregamento; gravações continuam bloqueadas antes da hidratação completa.
- Compatibilidade com schema legado state preservada.

QA: 15 testes em Firebase simulado aprovados e sintaxe JS validada. Não houve teste de escrita real, exclusão real nem mudança de regras ou dados do Firebase.
Risco residual: a consulta integral ainda transfere grande histórico; em máquinas com pouca memória, a sincronização completa pode demorar. A separação definitiva de metadados e imagens e paginação auditLog exigirão etapa própria.

Rollback: restaurar apenas index.html de c6f1e2b3d1d4efa2427e5c189711d3c20b341064, sem mexer no Firebase.
Homologação operacional permanece pendente de validação em navegador real com conexão oficial.
