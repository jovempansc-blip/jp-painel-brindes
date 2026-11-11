# JP WORKSPACE — Hotfix visual da Distribuição Geral

**Data:** 11/11/2026  
**Status:** CANDIDATO PARA PUBLICAÇÃO; código oficial não alterado por este pacote  
**Revisão oficial de origem:** `b1f6f2fec74003440e7b150e92a0e637e1f929b8` (`main` de `jovempansc-blip/jp-painel-brindes`).

## O que foi corrigido

- **15 colunas do modo DETALHADA:** uma única tabela HTML e um colgroup de largura explícita total de 1.684 px, compartilhado pelo cabeçalho e corpo.
- **AÇÕES:** largura reservada de 244 px, suficiente para até sete botões de 27 px com espaçamento de 5 px, inclusive a ação especial de evento. Sem corte do último botão.
- **TOTAL, SALDO, RETORNO e GERAR:** campos com espaço suficiente, notas de saldo com quebra de linha legível e células verticalmente alinhadas.
- **Responsividade:** em monitores largos, a visão detalhada aproveita a largura disponível do painel; em notebooks e telas menores, a tabela mantém as dimensões mínimas e oferece rolagem horizontal, sem esmagar os botões.
- **Coluna PRÊMIO:** largura fixa do colgroup, mantendo o cabeçalho e o card do prêmio alinhados ao rolar a tabela.

## Escopo exato

O único arquivo operacional modificado é `index.html`, exclusivamente pela adição do bloco `<style id="jp-distribution-visual-fit-20261111">` imediatamente antes de `</head>`. O restante do arquivo anterior é **idêntico byte a byte**, verificado pelo teste de regressão estrutural.

Outros dois arquivos são novos e informativos: `QA/test_visual_fit_nov2026.cjs` e este documento.

**Nenhum acesso, escrita, alteração de estrutura, regra ou dado no Firebase. Nenhuma alteração de JavaScript, cálculo, saldo, ganhador ou integração.** A promoção externa permanece com sua proteção de segurança inalterada.

## Verificações concluídas

- QA estrutural/CSS: **15/15 PASS**.
- QA da correção anterior de distribuição: **9/9 PASS**.
- QA de saldo/histórico/estornos: **23/23 PASS**.
- QA da promoção externa (mocks): **14/14 PASS**.
- QA de segurança (mocks): **10/10 PASS**.
- **71/71 verificações direcionadas PASS.**
- Parser CSS: **36 regras, 0 erro de sintaxe**. JavaScript do painel: **sem erro de sintaxe**.
- Teste demonstrou preservação exata do arquivo anterior quando o bloco de CSS é removido.

**Limitações:** não foi executado teste visual no navegador conectado ao painel real nem com os diferentes zooms do computador do usuário. Homologação visual pós-publicação segue necessária (desktop, notebook, zoom 100% e 125%, rolagem até a última ação).

## Como atualizar, após autorização explícita do Board

Extrair o ZIP candidato e enviar os três arquivos aos mesmos caminhos no repositório oficial, preservando as pastas `QA/`. A publicação na branch `main` pode disparar deploy automático. Não fazer alterações no Firebase. Confirmar que os sete botões de ações da linha de evento e os seis botões das linhas normais permanecem inteiramente visíveis, além do alinhamento do cabeçalho.

## Rollback

O ZIP de rollback contém somente o `index.html` exato da revisão oficial `b1f6f2fec74003440e7b150e92a0e637e1f929b8`, para restaurar o layout anterior se necessário. **Não reverter registros ou saldos do Firebase.**

## Decisão solicitada

Aprovar, aprovar com condições ou solicitar ajustes para a publicação no GitHub oficial dos três arquivos do hotfix visual. Até essa decisão, nenhum arquivo do repositório oficial deve ser substituído.
