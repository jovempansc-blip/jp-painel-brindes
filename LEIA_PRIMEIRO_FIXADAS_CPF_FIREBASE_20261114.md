# JP BOARD ROOM — Release controlado: Promo Externa e Fixadas da Recepção

**Data:** 14/11/2026
**Board:** autorização explícita para executar as pendências identificadas, com validação de segurança.
**Base:** commit de produção `97c239591e7db87c4c21c22c3dbf9d3a0a171fc9`.
**Escopo integrado:** conectar a página Promo Externa ao mesmo projeto Firebase do Workspace, habilitar o campo CPF opcional com máscara/validação, integrar Fixadas/Histórico/Passaportes na interface da Recepção e permitir fixar/desafixar promoções mesmo sem claims personalizadas, usando apenas metadados de operação.
**Módulos nominal/Passaportes:** os lançamentos de CPF e beneficiários continuam bloqueados até homologação REAL das regras privadas do Firebase.

## Mudanças

- `assets/jp-promo-externa-env.js`: substitui configuração `null` pela mesma configuração pública de projeto do `index.html`. Não contém credenciais administrativas; a página conecta no RTDB oficial. `JP_EXT_SECURE_BANK_VERIFIED` permanece `false`.
- `promo_externa.html`: CPF opcional editável (sem salvar localmente), limite de 14 caracteres com máscara, tipografia/layout conservados. Cache bust.
- `assets/jp-promo-externa-core.js`: valida os dígitos verificadores, aceita CPF vazio.
- `assets/jp-promo-externa-pages.js`: formata campo e transmite CPF somente ao adaptador protegido quando usuário tenta cadastrar. Recebe erros de permissão e comunica na própria tela.
- `assets/jp-promo-externa-firebase.js`: quando a segurança de servidor vier a ser homologada, CPF preenchido poderá ser gravado exclusivamente no `winnerBank`, sem entrar em `state/months/*/distributions`. Enquanto não for, `checkAuth` bloqueia gravação nominal.
- `preview_recepcao.html`: integra a guia oficial Ativas / Fixadas / Histórico / Passaportes, menu ⋮ e fixação de promoção com consulta de histórico.
- `assets/jp-reception-passport.js`: corrige chamada de `render()` inexistente; altera apenas a fixação/desfixação de metadados para usar a identidade da Recepção existente (não exige claims que não foram configuradas). **Não reduz restrições sobre dados nominais.**
- `assets/jp-reception-passport.css`: mantém layout padrão e ancora menu à linha correta da promoção.
- Atualiza o contrato de teste de segurança de `null` para projeto oficial com gravação nominal bloqueada.
- Adiciona teste de navegação, persistência simulada de pin e CPF opcional.

## Verificações

- 16 testes dirigidos de navegação Fixadas/Histórico, fixação e CPF.
- 14 de Promo Externa; 10 de contrato de segurança; 3 de aviso da Recepção; 12 de distribuição multimês; 7 de commit Firebase simulado.
- **62/62 verificações direcionadas aprovadas.**
- Sintaxe de módulos JS e scripts inline HTML aprovada, sem IDs duplicados.
- CSS validado.
- Leitura pública de `receptionCampaignPins`: HTTP 200. Leitura de regras de Firebase sem autenticação: HTTP 403.
- Não foram efetuados lançamentos reais, não foram criados CPFs e não foram alteradas regras do Firebase.

## A09 — pendência P0: CPF e cadastro nominal real

O Banco de Ganhadores já apresentou leitura anônima. Ter um formulário com CPF opcional não reduz esse problema, pois nome e telefone também são dados pessoais.

**Não definir `JP_EXT_SECURE_BANK_VERIFIED=true` nem `JP_PASSPORT_PRIVATE_RULES_HOMOLOGATED=true` sem:**
1. obter acesso administrativo ao Firebase Rules, inspecionar permissões dos ancestrais e salvar snapshot para rollback;
2. restringir leitura de `winnerBank`, `passportPrivate` e qualquer outro ramo contendo PII;
3. configurar autenticação/roles de Estúdio e Recepção, com menor privilégio;
4. auditar emulador de regras com usuário anônimo e perfis de operador, além de testar reautenticação, concorrência e baixa;
5. registrar retenção, exclusão autorizada e fluxo de correção/rollback.

A opção de fixar promoções contém apenas ID e histórico de mudança, sem CPF. A persistência de pin usa transação, espera confirmação remota e mantém registros após o encerramento da campanha; validação operacional autenticada ainda é necessária.

## Rollback

Reverter o commit deste pacote para restaurar `promo_externa.html`, `preview_recepcao.html` e os três módulos da Promo Externa, removendo referências a novas extensões da Recepção. Preservar qualquer `receptionCampaignPins` já criado, sem excluir resultados, auditorias ou beneficiários. Reverter regras do Firebase somente com autorização separada caso tenham sido modificadas no futuro.

**Afirmar que cadastro nominal está liberado sem homologação é incorreto.** Esta entrega repara a infraestrutura de carregamento e torna a fixação visível, mas as gravações pessoais permanecem pendentes.
