# JP BOARD ROOM — Correção de retirada tardia (15/11/2026)

**Autorização do Board:** permitir a confirmação da retirada mesmo após vencido o prazo.
**Base de produção:** commit `876c6fbdf395925753c21ea0ea21aaea41b34887`.

## Escopo efetivo
- A Recepção volta a oferecer **CONFIRMAR RETIRADA TARDIA** para prêmios de promoção vencidos e resultados espelhados em itens, como já fazia para premiações simples.
- O modal informa que uma cota vencida pode ter sido devolvida à disponibilidade e recomenda conferir o saldo antes de registrar a retirada.
- A confirmação do ganhador segue as regras existentes de cadastro completo, Firebase e auditoria.
- A transação Firebase da promoção registra `deliveredAt`, `deliveredAtLabel`, `deliveredBy`, `deliveredLate` e `deliveryDeadline`. Uma transação concorrente que já entregou o mesmo prêmio é bloqueada.
- O histórico indica **RETIRADO FORA DO PRAZO**, sem excluir ou alterar o resultado original.
- O compromisso do prêmio retornará automaticamente ao cálculo de saldo após a retirada tardia, pois o registro passa a possuir `deliveredAt`. A quantidade física do prêmio não é alterada diretamente.
- A reversão da retirada continua disponível e, quando revertida, o indicador `deliveredLate` é limpo.

## Efeitos e cuidados
- Uma retirada tardia pode recompor uma obrigação que já foi reatribuída a outra promoção. Portanto, **o estoque disponível pode ficar insuficiente**. A Recepção alerta o operador. Esta versão não oferece bloqueio transacional global entre múltiplas campanhas.
- Nenhuma alteração nas regras Firebase, autenticação, promoções existentes, prêmios, resultados ou saldos ocorreu durante os testes.
- A liberação permanece em piloto com dados fictícios, conforme a autorização vigente.

## QA
21 testes de retirada tardia e recomposição de estoque + 18 testes de vencimento e recirculação = **39/39 aprovados**.
HTML, IDs da Recepção e scripts inline verificados sem erros.
Não houve escrita de teste no Firebase real e não há homologação E2E de múltiplos operadores reais.

## Rollback
Restaurar somente `preview_recepcao.html` e `QA/test_pilot_promo_expiry_20261115.cjs` a partir do commit anterior `876c6fb`; `QA/test_late_pickup_20261115.cjs` e este documento podem permanecer. Nunca apagar registros de retirada ou histórico do Firebase durante rollback.
