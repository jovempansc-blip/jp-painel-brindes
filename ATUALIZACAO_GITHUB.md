# HOTFIX – REGULARIZAÇÃO DE PRÊMIOS EM HORÁRIO PASSADO

Escopo: programação manual. Somente o dia atual, horários oficiais anteriores à hora corrente, novos PRÊMIOS. A regra de saldo e cota não é desativada.

**ATENÇÃO:** o registro retroativo fica PENDENTE até o operador confirmar o ganhador NO PAINEL DO ESTÚDIO, na mesma data e hora original. O lançamento não repete automaticamente o sorteio.

## Implantação
1. Confira o SHA-256 atual de `index.html` e `assets/prog-manual.js` com os valores `existing_*` do MANIFEST.
2. Para publicar somente se o Board autorizar esta alteração: fazer backup dos dois arquivos; substituir os dois arquivos da branch `main` conforme os mesmos caminhos deste pacote.
3. Aguarde o GitHub Pages publicar. Recarregue o painel com Ctrl+Shift+R.
4. Na programação manual, selecione data atual, emissora e o horário passado; arraste o prêmio; confirme a quantidade, explique o motivo e salve. Depois abra o estúdio e registre o(s) ganhador(es) no horário original.
5. Verifique no Firebase e em outra sessão se o item e o ganhador foram persistidos; confira saldo e relatório.

## Restrições
- Datas anteriores a hoje continuam bloqueadas.
- Pautas, merchans e movimentação de itens realizados continuam bloqueados.
- Sem saldo/cota, a inclusão continua bloqueada para evitar dupla contagem.
- Premiação registrada não é reexecutada: é apenas regularização de histórico.
- QA local 8/8; não há testes autenticados na base HML/produção nem em duas sessões.
- Backup do nó operacional de produção (de turno anterior) não substitui novo backup imediatamente anterior à implantação.

## Rollback
Recoloque `ROLLBACK/index.html` e `ROLLBACK/assets/prog-manual.js` nos caminhos originais. Alterações de código não apagam registros retroativos feitos depois da atualização.
