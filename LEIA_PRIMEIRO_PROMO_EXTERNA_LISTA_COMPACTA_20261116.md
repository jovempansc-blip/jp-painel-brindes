# JP BOARD ROOM — Promo Externa compacta na Recepção (16/11/2026)

**Decisão do Board:** criar quinta aba PROMO EXTERNA, deixar listagem pequena para aproximadamente 20 ganhadores, titular na primeira linha e acompanhante na segunda, mostrando os dados de ambos.

**Base de código:** commit 5af500fe19e17ee168f6166f67ecff4d22b25fef.

## Escopo
- Quinta aba PROMO EXTERNA junto a Promoções, Fixadas, Histórico e Passaportes.
- Remoção do quadro externo independente abaixo das abas, sem remover o ID de integração nem o listener de Firebase.
- Ganhadores externos agrupados por ação/competência; promoção e prêmio aparecem uma vez no cabeçalho do grupo.
- Cada cadastro ocupa uma faixa compacta. Linha 1: TITULAR, nome completo, telefone formatado, CPF cadastrado/não informado. Linha 2: ACOMPANHANTE, nome, telefone e status de CPF quando prêmio é par. CPF completo não é exposto na lista.
- Quantidade, status, data de cadastro e botão Confirmar retirada/Conciliar banco à direita.
- A lista tem rolagem interna e limite de altura; layout adaptado para tablets e celulares.
- A pesquisa encontra titular, acompanhante, telefone, ação e prêmio.
- O mesmo código de retirada e de conciliação continua ativo; não há alteração de saldo, cotas, dados de ganhadores ou regras Firebase.

## QA A09
26 testes do novo cenário com 20 ganhadores, 10 testes de regressão da ponte, 2 módulos JS verificados, dois scripts inline, unicidade de 19 IDs da página, CSS analisado sem erros. Total 36/36 verificações funcionais aprovadas.
Os testes usam Firebase simulado; não foram executadas alterações de dados no Firebase real.

## Risco
Permanece o modo piloto com leitura/gravação públicas no Realtime Database. Não homologado para dados pessoais reais; só utilizar dados fictícios. O CPF é apenas sinalizado na listagem.

## Rollback
Restaurar somente preview_recepcao.html, assets/jp-reception-passport.js, assets/jp-reception-passport.css, assets/jp-promo-externa-reception-bridge.js da base 5af500f. Não modificar os cadastros, resultados, audit logs ou regras no Firebase.
