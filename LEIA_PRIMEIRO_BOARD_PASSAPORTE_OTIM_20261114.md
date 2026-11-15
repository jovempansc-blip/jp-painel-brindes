# JP Workspace — Melhorias A01/A06/A08/A09 aprovadas pelo Board

Data: 14/11/2026. Fonte oficial: GitHub main `fbaecd9d4afc7b2b8dc393b4038ff62b99624eb7`. Escopo: quatro melhorias aprovadas no Board; **não** inclui alteração de regras administrativas do Firebase nem gravação de cadastros reais.

## Entrega
1. **Identificador canônico por ingresso:** `JPPassportCore.ticketId(promoId, evento, winnerId, seat)` reproduz exatamente o ID que a Recepção já utiliza, evitando dupla identidade. Agora aparece na ficha e é gravado na mesma transação privada de uma identificação ou retirada, somente após autorização.
2. **Recepção prioritária:** a lista de resultados abre em **PENDENTES**; acrescenta filtro **PRÓXIMOS 3 DIAS** abrangendo todos os meses, sem incluir retirados, vencidos, fora de prazo ou itens sem data. Mantém VENCE HOJE, VENCIDOS, TOTAL, RETIRADOS e os filtros mensais anteriores.
3. **Passaporte compacto:** ficha por ganhador com quantidade de shows, cota reservada, direitos e retiradas. Eventos individuais recolhíveis; cada ingresso continua com seus próprios controles, confirmação e status; nomes de beneficiários privados não são exibidos quando o acesso não está autorizado.
4. **Conciliação automática de leitura:** comparação em tempo real entre direitos, vínculos de eventos, cota do segmento, reserva específica e baixas nominais disponíveis para operadores autorizados. Alertas por cota insuficiente, inconsistência de reserva e direito excedente. Implementada trilha `ticketLedger` de operação por ingresso dentro da **mesma transação privada** da identificação/retirada, sem segunda baixa do estoque e sem expor destinatários.
5. **CPF opcional:** CPF não impede cadastro/retirada se estiver em branco, mas, quando preenchido, é validado pelos dígitos verificadores. Nome completo permanece obrigatório. Não desbloqueia o servidor nem desativa permissões existentes.

## Exclusões de segurança e dependências
- O campo opcional é uma decisão de formulário, **não** autoriza gravar nome/telefone/CPF em base com leitura anônima.
- `JP_EXT_SECURE_BANK_VERIFIED` e `JP_PASSPORT_PRIVATE_RULES_HOMOLOGATED` permanecem restritos; as chamadas que gravam nome ou baixa dependem de autenticação e da homologação real das regras RTDB.
- O usuário solicitou desbloqueio geral e aceita responsabilidade; a conta `jovempansc@gmail.com` foi indicada, mas **a sessão administrativa do Firebase Console ainda está como NEEDS_AUTH**. Foi iniciado fluxo de autenticação seguro sem pedir senha no chat. Não foi permitido ler regras oficiais ou configurá-las administrativamente.
- Devolução automática de prêmios vencidos ao estoque, alterações físicas de quantidade e Cloud Functions de conciliação autoritativa permanecem fora deste commit. Este código **não** muda os saldos da Distribuição Geral nem o código `promoCommitmentQty`. O ledger privado preparado registra fatos no mesmo commit, quando o acesso nominal for homologado.
- O relatório de conciliação compara dados recebidos e não substitui transações de servidor para alterar saldo físico; também não atualiza dados protegidos quando o Firebase nega permissão.

## QA
- Testes novos Passport Core+UI+conciliação 26; Passport Core ajustado 36; datas 10; renderização real de HTML com mocks 10; Recepção Stage1 23; Segurança 10; Promo Externa 14 = **129/129 PASS**.
- Documentos HTML, scripts inline, módulos JS, CSS e IDs DOM validados.
- Função de compromisso do estoque `promoCommitmentQty` comparada bit a bit com versão anterior: inalterada.
- Dados sintéticos apenas; **nenhuma gravação de dados reais** realizada.
- Homologação real autenticada em Firebase e testes E2E em navegador pendentes por falta de acesso administrativo.

## Arquivos alterados
`index.html`, `preview_recepcao.html`, `assets/jp-passport-core.js`, `assets/jp-reception-passport.js`, `assets/jp-reception-passport.css`, `QA/test_passport_core.cjs`. Novos `QA/test_passport_optim_20261114.cjs`, `QA/test_reception_due_20261114.cjs`, `QA/test_passport_render_20261114.cjs`.

## Rollback
Reverter os seis arquivos alterados ao commit `fbaecd9`; remover os testes novos do commit, se necessário. Preservar qualquer cadastro nominal, resultado, fixação, reserva, saldo ou auditoria real. `ticketLedger` é aditivo e não deve ser apagado manualmente. Não alterar Firebase Rules durante rollback sem inspeção e autorização específicas.
