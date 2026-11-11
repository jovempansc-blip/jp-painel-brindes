# JP WORKSPACE — PACOTE DE CORREÇÃO LOCAL • 11/11/2026

**Origem:** repositório jovempansc-blip/jp-painel-brindes, branch main, commit 691dc3db1233c84109e58fed9443f5f656e9683a.
**Escopo:** correção local de código e testes. Nenhuma publicação em Firebase ou GitHub.
**Status:** CANDIDATO À HOMOLOGAÇÃO. Não aprovado para uso com dados pessoais reais sem validação.

## Alterações

1. Distribuição Geral: campos numéricos agora gravam ao concluir a edição (change), e não a cada tecla. Salvamento exige confirmação do Firebase e leitura independente do valor persistido. Aumento que agrava déficit é bloqueado. O operador recebe erro explícito quando a gravação falha.
2. Recebimento adicional: botão soma novas unidades físicas, seleciona a opção de acrescentar à cota do mês aberto e exige identificação de origem/lote seguida de SALVAR. É possível escolher manualmente manter unidades como saldo global não alocado. A cota mensal não pode ser reduzida diretamente.
3. Recepção: recuperada a execução do controlador existente (estava marcado como script não executável); substituída dependência de configuração ausente por assets/jp-reception-config.js e removido script inexistente. A ponte com ganhadores externos agora tem listeners, autenticação, conciliação e baixa, mas continua protegida até homologação de segurança.

## BLOQUEIO P0 — BANCO DE GANHADORES

A consulta SEM autenticação ao endpoint público do Firebase /jp-painel-brindes/winnerBank/records.json?shallow=true respondeu HTTP 200.
Isso exige tratar dados pessoais como potencialmente expostos. Foi preservado JP_EXT_SECURE_BANK_VERIFIED = false em assets/jp-promo-externa-env.js.
NÃO mude a flag sem auditoria de regras RTDB por A09 e validação autenticada. Uma regra de leitura permissiva em nó pai do RTDB não pode ser revogada no nó filho. Pode ser necessária segregação de dados pessoais em árvore privada.
Este ZIP NÃO muda regras Firebase e NÃO desbloqueia o cadastro/retirada externa em produção.

## COMO ATUALIZAR O GITHUB

1. Guarde o commit oficial atual para rollback.
2. Extraia o ZIP de arquivos alterados. Faça upload dos ARQUIVOS, preservando os caminhos: index.html, preview_recepcao.html, assets/jp-promo-externa-reception-bridge.js, assets/jp-reception-config.js, QA/test_fix_nov2026.cjs e este README. NÃO envie o ZIP como arquivo único na raiz do repositório.
3. Não altere as regras do Firebase nem a flag de verificação nesta implantação. Teste em ambiente seguro antes da publicação.
4. Após upload, confira a atualização da página, os dados de novembro, o formulário de distribuição, a recepção e a leitura de saldo em duas sessões.
5. Libere integração externa apenas após parecer QA, backup, regras privadas e autorização do Board para o escopo.

## TESTES

- QA/test_fix_nov2026.cjs: 9/9 aprovados com mocks.
- QA/test_promo_externa.cjs: 14/14 aprovados com simulações.
- QA/test_security_contract.cjs: 10/10 aprovados.
- Sintaxe dos scripts HTML do Principal, Recepção, Promo Externa e do módulo de ponte: aprovada.
- Regressão legada do repositório: modificado 21/29 aprovados, 8 falhas; baseline oficial 20/29 aprovados, 9 falhas. Os testes antigos apresentam verificações obsoletas e não constituem homologação integral.
- NÃO houve teste ponta a ponta no Firebase real, duas sessões reais, leitura confidencial, implantação de regras ou ensaio de rollback de banco.

## ROLLBACK

Restaurar arquivos originais do pacote de rollback ou reverter o commit no GitHub.
Excluir os novos arquivos assets/jp-reception-config.js e QA/test_fix_nov2026.cjs ao reverter.
Nunca restaurar snapshots de banco sem backup e autorização expressa.
