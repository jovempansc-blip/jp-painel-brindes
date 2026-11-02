# JP Workspace — Hotfix preventivo de virada de mês | 02/11/2026

## Diagnóstico verificado
O Firebase contém `state/months/2026-11`, com `distributions`, `promos` e `label`, mas sem a coleção `items` no nó do mês. Isso é normal antes da primeira programação: o Firebase Realtime Database não mantém arrays vazios como nós persistentes. A condição `!month.items` impedia a primeira programação do mês, mesmo com o mês existente.

## Mudança
Em `assets/prog-manual.js`, somente mês realmente ausente ou inválido interrompe a transação. Coleções vazias ou ausentes são lidas por `rows()` como listas vazias. A validação subsequente ainda exige a distribuição real para prêmios e preserva os limites de estoque, quotas, histórico e conflito entre sessões.

Em `index.html`, somente o parâmetro de cache do JS passa a `AV58_1_39_MONTH_SAFE_20261102`, evitando navegador carregar o arquivo antigo.

## Procedimento após autorização EXPLÍCITA do Board
1. Confirmar que `index.html` e `assets/prog-manual.js` na branch `main` correspondem aos SHA-256 de `base_sha256` no MANIFEST. Se outro commit modificou esses arquivos, NÃO SUBSTITUIR SEM REBASE.
2. Garantir backup operacional recente e verificável. A correção não requer alterar o Firebase.
3. Substituir exatamente os dois arquivos nos caminhos indicados em `main`, sem tocar em outras telas, ativos, dados ou regras de segurança.
4. Conferir publicação e recarregar com Ctrl+Shift+R.
5. Homologar com registro autorizado: mês corrente com distribuições e sem `items`; adicionar uma única programação real, confirmar no Firebase e observar em outra sessão, sem duplicar prêmio ou ganhador.
6. Conferir que registro sem distribuição é recusado e que limite de rádio, conflitos e histórico continuam protegidos.
7. Se houver problema, restaurar os dois arquivos de `ROLLBACK` em `main`. Não reverter dados do Firebase sem autorização específica.

## Recomendação para toda virada de mês
Não pré-cadastrar prêmios fictícios nem copiar o saldo do mês anterior. A verificação de prontidão deve conferir a existência do mês, das distribuições/cotas aplicáveis ao novo mês e da grade oficial. A falta de `items` sozinha não é falha. Exibir alerta operacional quando realmente faltar configuração do mês e jamais anunciar 'salvo' sem confirmação da transação.

## QA
A correção foi exercitada em simulação; **o Firebase de produção não foi modificado** e não houve testes reais de duas sessões. Recomendação A09: validar em ambiente autenticado antes de publicação, ou obter aprovação excepcional de risco para publicação emergencial.
