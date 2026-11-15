# JP BOARD ROOM — Piloto autorizado: liberação de atualizações pendentes
Data: 15/11/2026. Repositório: jovempansc-blip/jp-painel-brindes
Base anterior: b96d9f674a05096c4fd7c99b1616ad6f91f7416b.
Autorização: Board determinou que a operação piloto utilize os dados fictícios existentes e mantenha as regras públicas atuais até a migração.

## Escopo
1. Promo Externa: habilitar cadastro de ganhadores e CPF opcional sem login no formulário, manter conexão ao Firebase oficial. Registro nominal no Banco de Ganhadores, com conciliação e validação de saldo; nenhuma segunda baixa do estoque.
2. Recepção Externa: usar os mesmos scripts atualizados de sincronização e baixa, sem exigir uma nova sessão Google no modo piloto.
3. Recepção principal: ponte da Promo Externa recebe ganhadores, disponibiliza conciliação e confirmação de retirada, sem login Google no piloto.
4. Passaportes da Recepção: habilitar configuração de vínculos dos shows e beneficiários, transferência quando permitida e retirada por ingresso, com transações de revisão e auditoria do identificador canônico. CPF continua opcional.
5. Promoções únicas: cálculo derivado libera a quantidade dos prêmios promocionais não retirados após o prazo, de acordo com a data de registro e cinco dias úteis (ou pickupBusinessDays da ficha). Não apaga a ficha nem altera a quantidade física total. Em eventos marcados como Passaporte, os shows vinculados já comprometem a reserva: sem reserva dupla do prêmio-base.
6. Bloquear retirada tardia na Recepção para resultados promocionais vencidos e espelhos físicos vinculados. Vencidos permanecem disponíveis no histórico mensal.

## Controles e limites do piloto
- Flags: JP_EXT_PILOT_MODE e JP_BOARD_PILOT_SYNTHETIC ativam diretamente este comportamento temporário. Fora dessas flags, o contrato anterior de autenticação permanece.
- As regras Realtime Database continuam as mesmas mostradas pelo Board: .read=true e .write=true no caminho jp-painel-brindes. **ISSO NÃO PROTEGE DADOS REAIS.**
- Somente dados fictícios/sintéticos devem ser digitados nesta etapa. A futura migração exigirá regras autenticadas, perfis de operador e revisão de retenção.
- O código não acessa nem modifica as regras administrativas do Firebase, não troca de banco, não usa a senha Google compartilhada.
- A recirculação por vencimento é derivada e idempotente, mas depende de relógio de referência do cliente e das transações atuais de cadastramento. Não equivale a um ledger de estoque autoritativo no servidor.
- A liberação pode impactar outros operadores porque o Workspace está no ar; homologação autenticada fim-a-fim com Firebase real ainda não foi feita.
- Não foram executadas escritas de dados reais no Firebase durante a preparação; testes usaram banco sintético em memória.

## QA (testes locais)
16 Promo Externa (inclui transações sintéticas em dois clientes), 18 vencimentos, 15 permissões de modo piloto, 8 ponte da Recepção, 36 Core Passaporte, 26 conciliação e CPF, 10 contrato existente: **129/129 aprovações**.
Arquivos HTML e JS com sintaxe válida e IDs DOM sem colisões, quatro páginas conferidas.

## Rollback
Reverter SOMENTE os dez arquivos de aplicação publicados, partindo do commit b96d9f6. Preservar dados do Firebase, resultados, fichas, ganhadores e auditorias; não apagar dados por rollback de frontend. Remover JP_EXT_PILOT_MODE e JP_BOARD_PILOT_SYNTHETIC da interface caso se encerre o piloto. A recirculação de estoque deve ser desativada em conjunto com o bloqueio de retirada tardia.

## QA A09
Candidato aprovado para piloto fictício, não certificado para uso com dados pessoais reais ou disponibilidade financeira de ingressos. Antes de substituir o piloto, é indispensável validar regras de servidor, concorrência e permissões individuais.
