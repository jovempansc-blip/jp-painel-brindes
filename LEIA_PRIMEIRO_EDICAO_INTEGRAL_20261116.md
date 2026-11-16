# JP BOARD ROOM — Edição completa do ganhador na Promo Externa

Data: 16/11/2026
Base: 85bf260bc2332ee7ab72c893d588af313d0944a3
Board determinou que o botão Editar permita todos os dados cadastrais, não apenas acompanhante.

## Escopo publicado
- No painel Promo Externa, "EDITAR CADASTRO" aparece em todo registro válido, individual ou par, inclusive entregue.
- O formulário existente recebe os dados atuais do titular: nome, telefone e CPF; os campos do acompanhante aparecem somente para par.
- "SALVAR ALTERAÇÕES DO CADASTRO" atualiza no mesmo registro em winnerBank/records, via transação Firebase. "CANCELAR EDIÇÃO" restaura o modo cadastro.
- Nome, telefone e CPF do titular, nome, telefone e CPF do acompanhante podem ser corrigidos; campos opcionais podem ser apagados.
- Validação de nome, telefone e CPF, verificação de duplicidades com outros ganhadores da mesma ação e auditoria da alteração.
- Registro da alteração é identificado pela versão, operador, data e nomes anteriores; não cria novo ganhador ou prêmio.
- Preserva ID, reserva, quantidade, registro original da premiação, data do sorteio, status de retirada e integridade do estoque.
- Os registros da Recepção refletem as alterações do Banco de Ganhadores através do listener atual.

## Pendências fora do escopo
- O Board solicitou CPF completo visível em todos os cadastros e na Recepção. NÃO FOI PUBLICADO: os links continuam sem autenticação, inclusive no Firebase em piloto público; a exibição integral em listagem pública implicaria divulgação de identificadores. Os números continuam armazenados e editáveis na ficha de cadastro. A solução segura requer ficha de consulta restrita por sessão autorizada.
- O Board pediu uma sugestão para lista espremida: transferir "Registros da ação" para uma área de largura total logo abaixo do formulário, com títulos agrupados por ação, cada registro em duas linhas, e rolagem interna. Esta mudança de layout permanece como proposta para decisão específica.

## QA
29 testes de cadastro/edição completa e preservação de estoque, 24 testes de regressão responsiva; 53 cenários distintos aprovados. 24 regressões legadas de acompanhante repetidas. HTML, IDs e JavaScript sintaticamente válidos.
Nenhuma escrita de dados real foi realizada no Firebase.

## Rollback
Restaurar somente promo_externa.html, assets/jp-promo-externa-pages.js, assets/jp-promo-externa-firebase.js do commit base 85bf260. Não apagar dados cadastrados e históricos do Firebase.
