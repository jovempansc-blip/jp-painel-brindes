# JP BOARD ROOM — Segunda correção: Centro de Campanhas + Passaportes Multieventos

**BASE OFICIAL INSPECIONADA:** `abe1ea52f93ecc9a7fbe99d35137c3cb100e601a`
**STATUS:** CANDIDATO EM AMBIENTE ISOLADO. NÃO PUBLICADO. NÃO HOMOLOGADO PARA GRAVAÇÃO DE CPF EM PRODUÇÃO.
**OBJETIVO:** preservar o padrão visual da Recepção, adicionar Fixadas/Histórico, e conectar uma promoção a eventos já cadastrados na Distribuição Geral, com beneficiários nominais e baixa independente de cada ingresso.

## Entrega funcional incorporada

1. Na Recepção, abas compactas **Ativas / Fixadas / Histórico / Passaportes** na seção visual oficial, sem alterar o cabeçalho, fonte, logo ou os cartões de resultados existentes.
2. Botão direito e menu ⋮ para **Fixar / Desafixar / Abrir / Consultar histórico / Configurar Passaporte**.
3. Fixações persistidas em `state/receptionCampaignPins`, com `pinned:true/false`, usuário autenticado, horário e histórico de operações no mesmo registro. Campanhas concluídas continuam visíveis quando fixadas.
4. Histórico anual das promoções já cadastradas e seus resultados originais; a consulta histórica não cria ou reedita ganhadores.
5. Atalho **Vincular shows** no formulário oficial de Promoções, disponível após salvar a promoção, levando à ficha correspondente da Recepção.
6. Ficha de Passaporte com evento na Distribuição Geral, competência, segmento, reserva específica, quantidade em unidades físicas, direitos por ganhador, indicação/transferência apenas conforme regulamento.
7. Vínculos armazenados em `state/passportCampaigns`, sem subtrair ingressos uma segunda vez. Validação de saldo físico e reserva específica; transação com auditoria em `state/passportAudit`.
8. Distribuição Geral: verificação remota antes da confirmação da edição do prêmio. Impede reduzir segmento ou reserva abaixo de compromissos de Passaportes já registrados.
9. Cadastro de beneficiários em caminho **separado do estado público**: `jp-painel-brindes/passportPrivate/<id_da_promocao>`. Um registro por evento, ganhador oficial e número do ingresso. CPF não é exportado para o Estúdio ou o painel de resultados.
10. Alterações nominais e auditoria ficam **na mesma transação** do registro privado. Verificação de revisão evita sobrescrita por dois atendentes; ingresso já utilizado fica bloqueado. Alterações sincronizam pela escuta do registro privado no Firebase.
11. Proteção adicional: antes da gravação nominal, o candidato verifica remotamente se o evento ainda está vinculado e se o ganhador continua constando no resultado oficial.

## Travas de segurança (fechadas)

As seguintes flags de publicação **não estão definidas nem ativadas no candidato**:

- `JP_PASSPORT_METADATA_RULES_HOMOLOGATED`
- `JP_PASSPORT_PRIVATE_RULES_HOMOLOGATED`

Sem a primeira, vínculo e desvinculação de evento permanecem desabilitados. Sem a segunda, CPF e baixa ficam indisponíveis. Todas as operações exigem Firebase Auth com claim explícita `jpReception` ou `jpAdmin`. A fixação também exige essa autenticação.

**Somente flags na interface NÃO constituem segurança.** O servidor Firebase deve negar leitura/gravação privada a qualquer cliente sem autorização.

## Pendências obrigatórias antes de qualquer publicação

**P0 — Regras Firebase e identidade:** inspecionar as regras atuais e suas permissões ancestrais. Se qualquer ancestral de `passportPrivate` conceder `.read: true`, uma regra restritiva no filho não protege CPF. Validar com emulador e depois em ambiente homologado que usuários anônimos, Estúdio e perfis não autorizados recebem `PERMISSION_DENIED`. Definir e comprovar claims `jpReception`/`jpAdmin`, logout, revogação e política de CPF (prazo de retenção e descarte). Não alterar regras nem permissões sem autorização do Board.

**P0 — Escritas concorrentes:** o vínculo passa por transação na raiz `state`, enquanto a Distribuição já utiliza salvamentos granulares. O guard adiciona verificação remota na edição principal, mas ainda é necessário testar concorrência entre duas sessões e verificar outros caminhos de edição de reservas, inclusive a edição de variantes de eventos e realocação por mês. Se algum caminho puder reduzir compromisso sem passar pelo guard, bloquear publicação.

**P1 — QA operacional:** testar, em ambiente autenticado e com dados sintéticos, a criação de três eventos vinculados, duas pessoas por evento, transferência permitida/proibida, CPF mascarado, baixas individuais, bloqueio de segunda retirada, consulta do histórico, fixação entre meses, atualização simultânea em dois computadores, falha de rede, recuperação após reload e responsividade em navegador real.

**P1 — Direitos/estoque:** verificar se o estoque originalmente reservado para cada segmento já contém a cota correspondente, sem novo desconto; revalidar par/individual na Distribuição e pedidos de cinco ou mais ganhadores.

**P1 — Auditoria:** proteger histórico de fixação e de destinatários contra alterações retroativas no servidor. O modelo de código evita exclusão pelo operador comum, mas as regras do Firebase ainda precisam garantir isso.

**P2 — Homologação do texto de Interface:** confirmar em navegador a largura dos campos e a responsividade, em particular CPF (até 150px em desktop), nome completo flexível, quantidade estreita e segmento compacto.

## Testes isolados

- Núcleo de regras e conversões de ingressos: **36/36**.
- Proteção remota da Distribuição: **6/6**.
- Integração, layout e travas de segurança: **31/31**.
- Execução simulada da Recepção: **7/7**.
- Teste legado de salvar distribuição com módulo de proteção simulado: **15/15**.
- Regressões existentes: multimês **12/12**, commit Firebase simulado **7/7**, aviso da Recepção **3/3**, Promo Externa **14/14**, transferência Firebase **4/4**, retroativa **8/8**, datas retroativas **18/19**.
- **Total validado até esta rodada: 161 aprovações; 1 falha histórica reproduzida também no commit oficial base.**
- A suíte legada de Distribuição sem adaptação de mock falha em sete cenários porque não carrega o módulo novo; com guard simulado no ambiente, passou em 15/15. Este é ajuste do *test harness*, não prova de homologação online.

Nenhum teste acima substitui homologação do Firebase Security Rules nem testes de interface em navegador autenticado.

## Arquivos do candidato

- `index.html`
- `preview_recepcao.html`
- `assets/jp-passport-core.js`
- `assets/jp-passport-distribution-guard.js`
- `assets/jp-reception-passport.js`
- `assets/jp-reception-passport.css`
- `QA/test_passport_core.cjs`
- `QA/test_distribution_guard.cjs`
- `QA/test_reception_integration.cjs`
- `QA/test_reception_runtime.cjs`
- `QA/test_distribution_editor_passport_compat.cjs`
- Este documento e `QA/FIREBASE_SECURITY_ACCEPTANCE.md`.

## Publicação e rollback

**Não publicar** antes da conclusão e parecer do A09 e da autorização específica do Board.

Rollback de código, após eventual autorização de publicação: restaurar os dois arquivos oficiais da revisão base e remover as novas extensões do cliente. **Não apagar** registros pessoais ou históricos criados por uma implantação posterior; preservá-los para migração controlada e observância da política de retenção. Reverter regras do Firebase exige um plano e autorização próprios.
