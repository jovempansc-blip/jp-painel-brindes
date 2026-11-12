# JP WORKSPACE — PROG MANUAL: Regularização auditada de prêmios em datas passadas

**Data:** 12/11/2026  
**Status:** CANDIDATO — sem publicação no GitHub oficial e sem alterações no Firebase real  
**Código de origem:** commit `f1b9d33cc4f1c87ef26794597b942c9c79032081` da branch `main`.

## Demanda

Permitir que o operador inclua, pela **PROG MANUAL**, um prêmio em data e horário já passados para reconstruir o histórico de programação quando houve indisponibilidade ou inconsistência operacional do painel.

A restrição anterior aceitava apenas novos prêmios de **horários anteriores no próprio dia**. Três bloqueios impediam inclusão em dias anteriores: no arraste, na confirmação da quantidade e dentro da transação de salvamento.

## Comportamento corrigido

1. Ao selecionar uma data passada em PROG MANUAL, a tela informa **REGULARIZAÇÃO DE DATA PASSADA**.
2. Um prêmio ainda não programado nesse registro pode ser incluído em um dos horários válidos da grade do dia original, desde que o prêmio estivesse dentro da vigência e haja saldo do canal Rádio na competência.
3. A inclusão exige a **justificativa preenchida pelo operador**, uma confirmação expressa e o botão **Salvar Programação**. Não há gravação automática pelo arraste.
4. Enquanto o novo item ainda está em rascunho, o operador pode ajustar a quantidade ou descartá-lo. Após a gravação, o item histórico fica protegido contra edição e exclusão no fluxo manual.
5. O salvamento usa a transação já existente do Firebase e confere o registro após gravar.
6. O cadastro recebe o dia e horário originais, a data/hora real do lançamento, motivo da regularização, sinalizador de retroatividade e auditoria em `manualProgramHistory`.
7. O item permanece **PENDENTE**: não é marcado como realizado, não atribui ganhador, não sorteia novamente e não altera resultados existentes.

## Limites e proteções preservados

- Somente **novos prêmios** podem ser incluídos retroativamente por esta exceção.
- Pautas, merchans e remanejamentos de programação anterior continuam bloqueados.
- Registros realizados, ganhadores e resultados anteriores não são alterados nem apagados.
- A data deve pertencer à vigência do prêmio e à competência efetivamente cadastrada.
- O horário deve pertencer à grade oficial do dia. Se a grade histórica não estiver disponível, o sistema continuará impedindo a inclusão, exigindo diagnóstico específico.
- A quantidade deve respeitar a disponibilidade de Rádio e os créditos de retornos validados, sem criar estoque físico fictício.
- O salvamento recusa tentativas de alterar registros históricos existentes, omitir justificativa, forjar um ganhador ou marcar o novo item como realizado.
- Não há migração, estorno ou alteração automática em dados do Firebase.

**Dependência operacional:** o registro de ganhador de uma data anterior, caso seja necessário, deve seguir fluxo próprio e ser validado separadamente. Este escopo não modifica o Estúdio nem garante edição retroativa de resultado.

## QA

- Nova suíte `QA/test_retro_dates_nov2026.cjs`: **19/19 PASS**. Inclui inserção em 11/11 executada em 12/11, justificativa obrigatória, transação RTDB simulada com leitura de volta, auditoria, limite de saldo, vigência, cancelamento, proteção de resultados e bloqueio de pauta histórica.
- Suíte existente adaptada `QA/test_retro.cjs`: **8/8 PASS**.
- Demais testes direcionados (distribuição, estoque, retornos, segurança): **135/135 PASS**.
- Total direcionado executado: **162/162 PASS**.
- Regressão legada `tests/*.cjs`: **21/29 PASS, 8 falhas históricas inalteradas**.
- `QA/test_visual_fit_nov2026.cjs` foi excluído da soma: depende de caminho absoluto de fonte antiga inexistente neste ambiente. Não testa PROG MANUAL.
- Sintaxe do novo JavaScript: **PASS**.

**Não homologado:** UI real em navegador, gravação autenticada no Firebase real, simultaneidade entre dois operadores e validação do retorno visual após recarregar o painel.

## Arquivos do candidato

1. `assets/prog-manual.js` — habilitação restrita para novos prêmios em datas anteriores, justificativa, bloqueios e auditoria.
2. `index.html` — atualização do parâmetro de versão do script para evitar cache do navegador.
3. `QA/test_retro.cjs` — atualização dos testes anteriores.
4. `QA/test_retro_dates_nov2026.cjs` — novos testes de persistência e segurança retroativa.
5. `LEIA_PRIMEIRO_PROG_MANUAL_RETRO_DATAS_20261112.md` — este documento.

## Roteiro de homologação

1. Confirmar build e deploy do GitHub Pages após eventual aprovação e publicação.
2. Abrir PROG MANUAL em 12/11 e selecionar **11/11/2026** na Jovem Pan 101,7.
3. Escolher um prêmio válido com saldo e horário oficial; informar quantidade e motivo real da regularização.
4. Conferir no rascunho o carimbo de data original e o status pendente; salvar.
5. Atualizar o navegador e reabrir 11/11. Confirmar o prêmio programado, o saldo e o histórico de regularização.
6. Confirmar que resultados realizados continuam intactos, sem novo ganhador automático.
7. Em base de homologação, testar datas antigas, outras emissoras, estoque insuficiente, prazo do prêmio e edição concorrente.
8. Não repetir o mesmo lançamento em produção sem confirmar se a gravação anterior ocorreu.

## Rollback

O ZIP de rollback restaura `assets/prog-manual.js`, `index.html` e `QA/test_retro.cjs` da revisão anterior `f1b9d33`. Os dois arquivos novos podem permanecer inativos se não forem removidos em uma decisão posterior. Um rollback de código **não desfaz** históricos ou programações eventualmente gravados no Firebase.

## Decisão do Board

Solicita-se aprovação explícita para publicar **somente os cinco arquivos** do candidato no GitHub oficial. Não alterar diretamente dados, regras, permissões ou configurações do Firebase. Após publicar, verificar commit, build, deploy e manter a homologação operacional **pendente** até o teste com a operação real.

