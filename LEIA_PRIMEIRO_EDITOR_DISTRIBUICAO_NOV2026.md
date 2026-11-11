# JP WORKSPACE — Editor de Distribuição V2

**Data:** 11/11/2026
**Status:** CANDIDATO À HOMOLOGAÇÃO — NÃO PUBLICADO NO GITHUB OFICIAL
**Revisão de origem:** 70b29ba008e70be7198a8b061a8dfeddf18ae8cf — jovempansc-blip/jp-painel-brindes, branch main.

## O que muda

A ficha agora prioriza quatro indicadores: estoque físico, cota do mês, unidades destinadas e saldo livre. A distribuição por canal e o histórico de acréscimos ficam sempre visíveis. Recebimento, informações do prêmio, rodízio, fontes e cores, versões por data e conferência detalhada ficam em áreas expansíveis.

Os **21 blocos originais do formulário e seus IDs foram preservados**; o novo layout reaproveita os mesmos campos. Nenhum registro existente é migrado ou apagado.

## Como salvar e atualizar a tabela

- As alterações são identificadas como pendentes.
- O botão principal passa a ser **SALVAR E CONFERIR**.
- O painel compara o cadastro aberto ao Firebase antes da gravação, para bloquear edição sobre dados já alterados por outro operador.
- Depois de gravar, confere novamente estoque, cota, canais, título, descrição, período e histórico.
- Somente após essa conferência o painel mostra a confirmação e atualiza a tabela.
- Se houver falha, restaura a última base confirmada, tenta recarregar os dados atuais do servidor e informa que o salvamento **não foi confirmado**. Uma falha parcial pode ter escrito parte dos dados; é indispensável conferir a base antes de tentar novamente.
- Uma edição nova não pode criar déficit na cota mensal, considerando a conversão de pares em unidades.

O botão **+ ACRESCENTAR AO ESTOQUE** prepara o acréscimo. É preciso informar origem/lote e clicar **SALVAR E CONFERIR** para gravar.

## Histórico e correções

O histórico da ficha apresenta data, origem, competência, acréscimo físico e acréscimo à cota. O botão **ESTORNAR ACRÉSCIMO** permite desfazer lançamentos reversíveis. O registro original não é apagado: o sistema adiciona uma linha de estorno vinculada ao recebimento original. Não é permitido estornar unidades já destinadas, programadas ou realizadas.

Lançamentos antigos conhecidos apenas pelo log de auditoria podem ser exibidos, mas **não são automaticamente estornáveis**, pois alguns não incluem a cota original confiável.

## Testes executados

- Estrutura e preservação da ficha: **37/37 aprovados**.
- Gravação do formulário completo (simulada): **7/7 aprovados**.
- Persistência granular RTDB (simulada): **5/5 aprovados**.
- Histórico e estorno (simulados): **23/23 aprovados**.
- Testes da correção anterior: **9/9 aprovados**.
- Promoção externa (simulada): **14/14 aprovados**.
- Contrato de segurança (simulado): **10/10 aprovados**.
- **Total: 105 verificações direcionadas aprovadas.**
- Regressão legada: **21/29 aprovados, oito falhas anteriores sem novas falhas detectadas**.
- Sintaxe JS e CSS: aprovada.

**Limitações:** ainda não houve teste autenticado com o Firebase real, homologação visual em navegador real nem concorrência real entre dois operadores. Não tratar o pacote como resolução homologada em produção.

## Arquivos do ZIP candidato

1. index.html — acoplamento do editor visual, confirmação pré/pós-gravação e recuperação após erro.
2. assets/jp-dist-editor-v2.js — navegação da ficha e indicadores operacionais.
3. assets/jp-dist-editor-v2.css — layout responsivo.
4. QA/test_distribution_editor_save_nov2026.cjs — testes do salvamento.
5. QA/test_firebase_distribution_commit_nov2026.cjs — testes de persistência granular.
6. QA/test_editor_layout_nov2026.py — auditoria de campos e estrutura.
7. LEIA_PRIMEIRO_EDITOR_DISTRIBUICAO_NOV2026.md — instruções e QA.

## Roteiro recomendado de homologação em base de testes

1. Abrir uma distribuição fictícia com 180 unidades físicas, cota de novembro 90 e 90 já destinadas.
2. Acrescentar 20 unidades, informar origem e manter a opção de enviar à cota de novembro; confirmar a prévia 200 / 110 / 20 livres.
3. Salvar e recarregar a tabela em duas sessões. Verificar valores nos dois meses.
4. Destinar explicitamente 10 pares ao Rádio e salvar. As 20 unidades devem deixar de estar livres.
5. Abrir histórico, conferir o acréscimo e tentar estornar: deve bloquear enquanto o saldo estiver comprometido.
6. Testar estorno de acréscimo livre e conferir a linha de estorno, preservando o original.
7. Simular falha de escrita e edição simultânea: nenhum valor pode ser anunciado como confirmado sem leitura do servidor.
8. Conferir também no navegador com zoom de 100% e 125%.

## Publicação e rollback

A publicação dos sete arquivos no GitHub oficial depende de **autorização explícita e específica do Board**. Nenhum dado, regra, permissão ou coleção do Firebase deve ser alterado diretamente neste escopo.

O ZIP de rollback contém o index.html original da revisão 70b29ba008e70be7198a8b061a8dfeddf18ae8cf. Ao restaurá-lo, a interface nova deixa de ser carregada; os dois assets novos podem permanecer inativos até decisão posterior sobre exclusão. O rollback não modifica os dados de produção.

