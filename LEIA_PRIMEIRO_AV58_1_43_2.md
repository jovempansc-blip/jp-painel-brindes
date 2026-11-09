# JP BOARD ROOM — PROPOSTA AV58.1.43.2 | RETORNO POR CADASTRO E INTERFACE COMPACTA

**09/11/2026 — não publicada.**

## Solicitação do Board
Cada cadastro de prêmio deve apresentar sua própria quantidade de retornos confirmados; o campo RETORNO deve mostrar apenas o número, sem textos empilhados que comprimam a tabela.

## Diagnóstico (leitura da base oficial, sem gravação)
- O Rádio Celebrate 2026 — Meduza tem **15 ocorrências com status SOBRA** ligadas ao seu próprio `distributionId` (os registros são de outubro, mas a campanha mantém o mesmo ID em novembro).
- Existem **4 ocorrências com SOBRA de Roda Gigante** num cadastro de outubro com ID diferente do novo cadastro de novembro.
- Existem **4 ocorrências com SOBRA do Passaporte da Diversão** num cadastro de outubro também diferente do novo cadastro de novembro.
- Os cadastros novos de novembro de Roda Gigante/Passaporte não devem receber esses créditos automaticamente. A repetição de nome não comprova identidade do estoque ou da competência.
- Esses números são **ocorrências de retorno**, não equivalem necessariamente à mesma quantidade de ingressos físicos. Um registro de prêmio entregue por PAR pode corresponder a 2 unidades físicas.

## Correções
1. **RETORNO visual = número único clicável**, largura limitada a 64px (54px em telas menores). Sem textos de status repetidos sob o número. O clique preserva acesso ao detalhamento completo.
2. A contagem usa ID do cadastro, status SOBRA, TRANSFERIDO ou REALOCADO e um identificador imutável por ocorrência para não contar o mesmo resultado em cópias mensais.
3. A visualização agrupa cadastros somente quando houver identificador explícito de campanha-mestre; o nome não é mais suficiente para fundir cadastros distintos.
4. Ao abrir retorno de um prêmio, a seção **OUTROS CADASTROS DO MESMO PRÊMIO** pode listar retornos históricos registrados sob outros IDs que tenham mesmo nome + título, para consulta. Esses registros NÃO alteram a coluna atual nem tornam crédito de outubro disponível em novembro.
5. O módulo `assets/return-balance.js` já incorpora a correção Red Team AV58.1.43.1: um crédito transferido para outro segmento não permanece disponível para reprogramar no Rádio. A referência de cache foi atualizada no `index.html`.
6. Não existe alteração de dados, exclusão de prêmios, alteração de programação ou mudança de permissões.

## QA
- 19 cenários de transferência de retorno: PASS.
- 4 cenários de gravação Firebase simulada: PASS.
- 13 cenários novos de interface/contagem por cadastro, deduplicação e distinção de mês: PASS.
- 1 teste Red Team de crédito duplicado: PASS.
- Sintaxe JS da página e do `assets/return-balance.js`: PASS.
**TOTAL: 37/37 verificações locais aprovadas.**

## Pendências e restrições — A09
- Firebase HML: acesso autenticado ainda não disponível (HTTP 401); nenhum backup nem teste E2E real.
- Transferência de sobras entre meses continua bloqueada. Não é seguro converter retornos antigos em novos créditos sem conciliação física e financeira.
- Quando a cota do Rádio está totalmente comprometida/programada, a transferência pode ser bloqueada pelo controle de saldo; essa regra ainda precisa de uma solução específica.
- Publicação no GitHub e aplicação ao Firebase exigem NOVA AUTORIZAÇÃO EXPRESSA DO BOARD. A aprovação anterior é para homologação, não para produção.

## Escopo futuro sugerido, após homologação
Substituir exclusivamente `index.html` e `assets/return-balance.js`, desde que os SHA-256 atuais no GitHub correspondam a `current_production_baseline_hashes` no MANIFEST; caso contrário, PARAR e adaptar.
Validar o GitHub Pages em duas sessões e um teste com registros fictícios, sempre sem editar prêmios reais.
Rollback: recolocar `ROLLBACK/index.html` e `ROLLBACK/assets/return-balance.js` nos caminhos originais. Reverter código não desfaz transações de dados; restauração de Firebase depende de outra aprovação.
