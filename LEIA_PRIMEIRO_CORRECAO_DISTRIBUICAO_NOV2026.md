# JP WORKSPACE — Distribuição Geral e histórico auditável

**Data:** 11/11/2026  
**Status:** CANDIDATO À HOMOLOGAÇÃO — NÃO PUBLICADO NO GITHUB  
**Repositório de destino (dependente de autorização do Board):** `jovempansc-blip/jp-painel-brindes`  
**Branch atual de referência:** `main` — `20b1d9ad6626b96eeedd50cb4fe50776309f924a`

## Objetivo e comportamento

1. Diferenciar **estoque físico** (campanha), **cota mensal** e **unidades destinadas aos canais**. O saldo livre da cota aparece na listagem e no editor separadamente do saldo disponível para sorteios de rádio.
2. Ao receber unidades adicionais e selecionar **acrescentar à cota deste mês**, atualizar imediatamente a prévia da cota e do saldo livre no formulário. O botão de recebimento prepara os valores; somente **SALVAR DISTRIBUIÇÃO** confirma no Firebase.
3. Manter a edição manual dos destinos (incluindo pares: 1 par = 2 unidades) e impedir que uma atualização em tempo real de outra estação apague o número digitado antes da confirmação. Se o valor original tiver mudado remotamente, a edição conflitante é bloqueada.
4. Registrar cada acréscimo físico ou aumento manual de cota no `stockLedger` do prêmio, com ID, data, origem, competência e deltas físico/mensal. O histórico é preservado nas cópias mensais e a gravação é verificada por leitura independente do Firebase.
5. Permitir **ESTORNAR ACRÉSCIMO** sem eliminar registros de auditoria. Bloquear quando afetar cotas de outros meses, unidades já destinadas, ingressos programados ou realizados, ou quando a fotografia do Firebase divergir da aberta na tela.

**Exemplo controlado:** estoque físico 180; cota de novembro 90; 45 pares (90 unidades) destinados; saldo livre do mês 0. Recebimento +20 no modo cota atual: estoque 200, cota novembro 110, saldo livre 20 unidades. O canal Rádio só aumenta quando o operador destina explicitamente as novas unidades a ele (por exemplo, +10 pares).

## Arquivos do pacote

- `index.html`: interface, cálculos, histórico, estorno e persistência.
- `QA/test_stock_ledger_nov2026.cjs`: regressão isolada do saldo mensal e histórico.
- `LEIA_PRIMEIRO_CORRECAO_DISTRIBUICAO_NOV2026.md`: este documento.

**Não modifica:** `assets/jp-promo-externa-env.js`, regras do Firebase, ganhadores, credenciais, dados em produção ou infraestrutura. A promoção externa continua bloqueada até auditoria de leitura privada.

## Resultado dos testes locais

- Novo QA: **23/23 PASS** (saldos, pares, persistência simulada, histórico, bloqueios, estorno e conflito com Firebase).
- QA anterior de correção: **9/9 PASS**.
- QA da promoção externa em mocks: **14/14 PASS**.
- QA do contrato de segurança em mocks: **10/10 PASS**.
- **56/56 verificações direcionadas PASS**.
- Regressão legada: **21/29 PASS, 8/29 FAIL**. Comparação executada com o pacote já publicado: os mesmos oito scripts legados falham antes e depois desta alteração; não houve nova falha nesses testes.
- Sintaxe JavaScript: **PASS**. `git diff --check`: **PASS**.

**Limitações materiais:** não foi feito teste autenticado contra o Firebase real, teste em navegador completo, teste E2E com dois usuários reais nem homologação operacional da Recepção. Pré-leituras do servidor reduzem riscos de edição concorrente, mas não substituem transações servidoras com controle de versão. O módulo de estorno foi criado e testado em simulação — não está homologado para produção.

## Tratamento do histórico antigo

Entradas de recebimento da versão anterior encontradas no `auditLog` são exibidas com data, origem e quantidade física. Como esses registros não incluem o delta mensal confiável, **não permitem estorno automático retroativo**. Corrigi-los exigirá uma reconciliação auditada específica, para não retirar prêmios de outra competência inadvertidamente.

## Roteiro mínimo de homologação (em base de teste)

1. Confirmar que a base de teste mostra a campanha com 180 unidades, cota de novembro 90 e 45 pares destinados.
2. Receber 20 unidades com origem preenchida, no modo **cota deste mês**, e verificar a prévia antes de salvar: 200 / 110 / 20 livres.
3. Salvar e confirmar os três indicadores após recarregar a página e em um segundo navegador conectado.
4. Destinar 10 novos pares ao Rádio; salvar e confirmar que as 20 unidades livres passam a destinadas, sem alterar ingressos já realizados.
5. Conferir o lançamento no histórico com origem, horário e competência.
6. Tentar estornar depois de destinar os 10 pares: deve bloquear. Retirar apenas os destinos ainda não comprometidos (quando permitido), então estornar; verificar 180 / 90 e histórico de estorno sem exclusão do original.
7. Simular erro de escrita e perda de conexão: nenhuma alteração deve ser anunciada como confirmada.
8. Testar edição simultânea para validar a detecção de mudança feita por outro operador.

## Decisão do Board

Solicita-se aprovação específica para **publicar no GitHub oficial apenas estes três arquivos**, mantendo o Firebase real sem alterações manuais, seguida de homologação operacional. Publicação em `main` pode acionar deploy automático se estiver configurado; validar o pipeline antes.

**Rollback:** restaurar o `index.html` exato da revisão `20b1d9ad6626b96eeedd50cb4fe50776309f924a`, disponível no ZIP de rollback fornecido separadamente. Não reverter nem apagar dados do Firebase sem uma decisão específica do Board.
