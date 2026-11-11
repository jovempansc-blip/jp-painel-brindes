# JP Workspace — Hotfix de persistência da Distribuição Geral

**Data:** 11 de novembro de 2026  
**Status:** CANDIDATO À HOMOLOGAÇÃO — SEM PUBLICAÇÃO NO GITHUB OU MODIFICAÇÃO DE DADOS REAIS  
**Base oficial do código:** commit c3184210a46169ad707f128d4987cae087e69cfc (main, jovempansc-blip/jp-painel-brindes).

## Problema apresentado ao Board

O operador edita uma distribuição, registra unidades adicionais e clica em Salvar e Conferir. Ao voltar para a tabela principal ou reabrir o prêmio, os valores não permanecem atualizados. Exemplo relatado: Ingresso Roda Gigante, 20 ingressos físicos, cota 20 e 10 pares já destinados ao Rádio.

## Falhas encontradas no código

1. **Recebimento ignorado no botão Salvar:** o campo Novas unidades recebidas somente era processado quando o botão separado + Acrescentar ao estoque era clicado. Digitar as unidades e clicar diretamente em Salvar e Conferir fechava o fluxo sem processar esse campo.
2. **Conferência prévia excessivamente rígida:** o salvamento usava uma função de conferência pós-gravação como bloqueio prévio, comparando snapshots locais normalizados com registros remotos que podem ter estrutura legada. Isso pode impedir uma edição válida antes da escrita.
3. **Saldo livre não equivale automaticamente a saldo de rádio:** unidades acrescentadas ao estoque/cota ficam livres até que o operador as destine ao canal. Faltava um atalho funcional claro para convertê-las em pares/individuais de Rádio e liberá-las para a programação.

A primeira falha é comprovável pela leitura do código. A segunda é uma possibilidade de falha validada em cenário simulado; **não houve leitura/autenticação contra a base Firebase real para estabelecer qual bloqueio específico ocorreu na sessão do usuário**.

## O que foi corrigido

- Salvar e Conferir reconhece novas unidades já digitadas, mesmo sem clicar no botão +. O botão + continua disponível para preparar a prévia.
- Quantidades inválidas e origem/lote não informado bloqueiam o recebimento, sem descartar o campo.
- Prévia e resumo do editor incluem unidades digitadas mas ainda não gravadas, deixando claro que são pendentes.
- A verificação antes da escrita passa a comparar os valores persistidos no Firebase com a base efetivamente carregada, tolerando diferenças estruturais equivalentes de cadastros antigos. Mudanças concorrentes continuam bloqueadas.
- A verificação **depois** da escrita continua conferindo dados reais do servidor: cota, estoque, canais, título, descrição, vigência e histórico.
- A opção de adicionar estoque respeita o modo escolhido pelo operador: cota deste mês ou somente estoque global.
- Botão **DESTINAR SALDO LIVRE AO RÁDIO**: transforma explicitamente o saldo livre em pares/individuais para o canal Rádio, mediante confirmação. Não gera sorteios e não grava automaticamente. Depois de Salvar e Conferir, o saldo do Rádio pode alimentar as rotinas de geração automática e programação manual.
- Revisão de cache dos assets do editor para evitar carregamento de uma versão antiga após eventual publicação.

## Exemplo funcional de teste — Roda Gigante

Estado inicial: 20 unidades físicas, cota novembro 20, Rádio com 10 pares (20 unidades), saldo livre 0.

O operador digita +20 unidades, informa origem e clica diretamente em Salvar e Conferir. Estado esperado após persistência: estoque físico 40, cota novembro 40, Rádio continua 10 pares, saldo livre 20 unidades.

Ao clicar Destinar saldo livre ao Rádio, confirmar os 10 novos pares e Salvar e Conferir: Rádio passa a 20 pares (40 unidades destinadas); saldo livre fica zero; 10 novos pares ficam potencialmente disponíveis para programação, descontada a quantidade já programada. O registro do recebimento permanece único no histórico.

## QA executado em ambiente de simulação

- Fluxo completo de edição e salvamento: **15/15 PASS**, incluindo o cenário Roda Gigante e duas gravações sucessivas sem duplicar lote.
- Alocação explícita no Rádio e cálculo de programação: **9/9 PASS**.
- Persistência granular Firebase RTDB simulada: **5/5 PASS**.
- Auditoria de histórico e estorno: **23/23 PASS**.
- Estrutura da ficha e preservação de campos: **37/37 PASS**.
- Testes anteriores do painel de distribuição: **9/9 PASS**.
- Promoção externa (mocks): **14/14 PASS**.
- Contrato de segurança da promoção externa (mocks): **10/10 PASS**.
- **Total direcionado: 122/122 PASS**.
- Regressão legada: **21/29 PASS, 8 falhas históricas inalteradas**. Os testes legados que falham continuam necessitando manutenção independente.
- Sintaxe de JavaScript e CSS: aprovada.

**Atenção:** esses testes usam dados e Firebase simulados. Não houve autenticação no Firebase real, conferência em dois navegadores reais ou homologação da operação em produção. O diagnóstico deve permanecer aberto até o Board confirmar o salvamento na interface publicada.

## Escopo exato para publicação futura

1. index.html — fluxo do recebimento no Salvar, validação do servidor antes/depois e prévia do estoque.
2. assets/jp-dist-editor-v2.js — botão Destinar saldo livre ao Rádio e indicadores com valores pendentes.
3. assets/jp-dist-editor-v2.css — estilo da ação nova.
4. QA/test_distribution_editor_save_nov2026.cjs — regressão ampliada do salvamento.
5. QA/test_radio_allocation_nov2026.cjs — teste novo de destinação e programação.
6. QA/test_stock_ledger_nov2026.cjs — atualização de mocks de conferência.
7. QA/test_editor_layout_nov2026.py — atualização da conferência do fluxo pré/pós-salvamento.
8. LEIA_PRIMEIRO_HOTFIX_PERSISTENCIA_DISTRIBUICAO_20261111.md — documentação, riscos e homologação.

**Não modificar:** dados, regras, permissões, credenciais, configurações ou registros do Firebase; ganhadores; programação já publicada; registros de auditoria. A promoção externa continua protegida.

## Homologação operacional necessária

1. Em base de homologação isolada, editar uma distribuição com 20 unidades e 10 pares de Rádio.
2. Digitar +20 unidades com origem, sem clicar no botão +, e usar Salvar e Conferir.
3. Atualizar a página: estoque 40, cota 40, Rádio 10 pares, saldo livre 20 e histórico do recebimento.
4. Destinar saldo ao Rádio, confirmar 10 pares e salvar novamente.
5. Atualizar a página e abrir a mesma ficha: Rádio 20 pares, saldo livre 0, histórico com apenas um recebimento.
6. Verificar diferença de programação disponível tanto no assistente automático quanto na opção manual.
7. Simular sessão concorrente e falha na conexão: a interface não deve anunciar gravação confirmada se o Firebase não confirmar.
8. Validar a apresentação em notebook, desktop e zoom 125%.

## Riscos e rollback

O conjunto de gravação do estado usa comparações de versão e atualizações de caminhos do Firebase, mas o commit completo de distribuição, auditoria e metadados não equivale a uma transação global única. Uma falha parcial pode exigir conferência do servidor antes de repetir. O rollback de código **não apaga nem reverte dados já gravados**. O pacote rollback contém as versões oficiais anteriores do index.html, dos dois assets e dos três testes alterados; arquivos informativos novos podem permanecer inativos.

**Decisão solicitada:** aprovação específica do Board para publicar estes oito arquivos no GitHub oficial em um único commit, sem alterações diretas no Firebase. A publicação em main poderá acionar deploy automático. A homologação operacional deve permanecer pendente até os testes reais.

