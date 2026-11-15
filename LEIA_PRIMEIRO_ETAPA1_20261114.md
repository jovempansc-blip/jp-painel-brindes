# JP BOARD ROOM — ETAPA 1 / PROMOÇÕES E PASSAPORTES

Data: 14/11/2026. Board: aprovação explícita da primeira etapa; recirculação automática e baixas nominais privadas condicionadas à homologação A09.
Base GitHub main: a420790ea5445d10c8408211c16dbdbbf0c56f7e.

ESCOPOS PUBLICADOS:
1. Campo campaignMode (single/passport) em Prêmio e Sorteio no Workspace principal. Independente de kind (promoção/pauta). Modo preservado em edição e salvo na ficha. Campanhas já vinculadas a múltiplos eventos são reconhecidas como Passaporte. A mudança para Única é recusada com vínculo ativo; mudança de modalidade é bloqueada com vencedores confirmados.
2. Recepção: aba PROMOÇÕES somente para promoções únicas; aba PASSAPORTES somente para campanhas multieventos; FIXADAS permanece independente. Histórico por seletor de mês AAAA-MM, usando mês de encerramento (endDate), sem incluir campanhas ainda ativas. Resultados originais e retiradas permanecem preservados.
3. Promoção Única: abrir resultados oficiais da Recepção para confirmação nativa individual de retirada, sem novo banco nem duplicação.
4. Passaporte: interface sinaliza a confirmação por ingresso/evento; gravação permanece desabilitada sem autorização privada Firebase.
5. Promo Externa: paleta opaca baseada na Recepção, sem cores vibrantes; cache-bust CSS.

O QUE NÃO FOI ALTERADO:
- Nenhuma regra Firebase, nenhuma gravação em estoque ou de dados pessoais, nenhuma publicação de benefícios a terceiros.
- Não há recirculação automática de prêmios vencidos; a rotina promoCommitmentQty é idêntica à base antes deste commit.
- As condições de autenticação e regras privadas do Banco de Ganhadores e Passaportes estão intactas.
- A confirmação nominal real do Passaporte permanece bloqueada até a homologação administrativa A09.

QA:
- 23 testes simulados de navegação da Recepção, fixação, histórico mensal, separação de modalidades, UI de retirada, segurança e estoque não alterado.
- 14 testes Promo Externa, 10 testes contrato de segurança, 3 testes aviso interno = 50 verificações aprovadas.
- Browser inline JS: sintaxe verificada; CSS parseado; IDs DOM sem duplicatas.
- Conferido segmento da função de estoque byte-a-byte com a main anterior; Recepção nativa inalterada exceto versão do script.
- NÃO constitui homologação de Firebase autenticado, multiplataforma ou regras privadas.

ROLLBACK:
Reverter os 6 arquivos da aplicação (index.html, preview_recepcao.html, promo_externa.html e os três CSS/JS assets modificados) ao commit a420790. Preservar todos os dados de promoções, resultados, estoque, entrega, pinagem e auditoria. O campo campaignMode em registros criados após a publicação é aditivo e pode permanecer no Firebase sem prejuízo do rollback.
