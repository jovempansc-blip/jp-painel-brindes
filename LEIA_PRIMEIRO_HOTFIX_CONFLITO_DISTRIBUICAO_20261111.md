# JP Workspace — Correção de conflito falso na gravação da Distribuição Geral

**Data:** 11/11/2026
**Status:** CANDIDATO À HOMOLOGAÇÃO. NÃO PUBLICADO NO GITHUB.
**Revisão oficial de origem:** `46d2f3b31804d2ff047f1154a69fff10a2fde5cf` na `main` de `jovempansc-blip/jp-painel-brindes`.

## Evidência objetiva da falha atual

Consulta **somente de leitura** ao Firebase RTDB oficial, caminho da distribuição de novembro, confirmou:

- Prêmio: **INGRESSO RODA GIGANTE**
- Estoque físico persistido: **20 unidades**
- Cota de novembro persistida: **20 unidades**
- Canal Rádio persistido: **10 pares**
- Histórico de acréscimos (stockLedger): **nenhum**
- Ficha exibida pelo operador, antes do salvamento: **40 unidades físicas / 40 cota / 20 pares no Rádio / 0 livres**

Conclusão: os dados apresentados na ficha durante a edição **não foram gravados**. Não é apenas falha de renderização na tabela principal.

## Causa identificada no código

A rotina `normalizePanelState` adiciona campos opcionais a registros legados carregados do Firebase, por exemplo `reservas=[]`, valores de reserva, datas e metadados. Na hora de persistir, `applyCollectionPlanToRows` comparava o **registro bruto remoto inteiro** com a **cópia normalizada em memória** por `JSON.stringify`.

A comparação acusava um conflito de edição mesmo sem alteração concorrente — a presença de campos preenchidos automaticamente gerava um falso positivo e bloqueava a transação.

## Alteração exata

Somente a verificação de conflito para a coleção `months/<competencia>/distributions` passa a normalizar **igualmente** o registro remoto e a cópia-base antes de comparar, usando a própria `normalizePanelState` já existente e chaves ordenadas para comparação determinística.

- Se os registros são semanticamente iguais, o salvamento é permitido.
- Se outro operador alterou efetivamente qualquer campo do mesmo prêmio, o conflito continua bloqueado.
- Registros, ganhadores, resultado de sorteios, estoque, canais, cálculo de pares, histórico e programação não são alterados pela correção em si.
- As demais coleções continuam com o comportamento original de concorrência.

## QA isolado

- Persistência granular RTDB: **7/7 PASS**, incluindo cadastro legado sem campos opcionais e alteração real concorrente.
- Formulário Salvar e Conferir: **15/15 PASS**.
- Destinação de saldo ao Rádio: **9/9 PASS**.
- Histórico/estorno: **23/23 PASS**.
- Estrutura visual: **37/37 PASS**.
- QA anterior de distribuição: **9/9 PASS**.
- Promoção externa (simulado): **14/14 PASS**.
- Contrato de segurança (simulado): **10/10 PASS**.
- **Total dirigido: 124/124 PASS**.
- Testes antigos: **21/29 PASS; mesmas oito falhas preexistentes**.
- Sintaxe JavaScript: **PASS**.

**Limitação material:** este hotfix não foi testado com uma escrita autenticada na base oficial. Não afirmar que o problema está definitivamente resolvido até confirmar que o número do Firebase mudou depois de salvar, e que a tabela e a ficha mostram o mesmo resultado.

## Roteiro de homologação após autorização

1. Aguardar deploy oficial da nova revisão e atualizar com Ctrl+Shift+R.
2. **Antes de editar novamente**, reabrir a Roda Gigante e conferir estoque 20 / cota 20 / Rádio 10 pares, comparando com o servidor oficial.
3. Registrar o lote físico adicional de **20 unidades** somente uma vez, informando a origem correta. Usar **cota deste mês** e Salvar e Conferir.
4. Conferir estoque 40 / cota 40 / Rádio 10 pares / livre 20 unidades após atualizar a página.
5. Usar **Destinar saldo livre ao Rádio**, confirmar 10 pares e Salvar e Conferir.
6. Conferir estoque 40 / cota 40 / Rádio 20 pares / livre 0 e histórico com um único recebimento, também após atualizar a página.
7. Validar o saldo de Rádio para programação automática e manual (descontada eventual programação existente).
8. Em caso de erro, copiar a **mensagem exata**, não repetir lançamento no mesmo prêmio sem conferir a base.

## Escopo para publicação FUTURA

1. `index.html` — rotina de comparação normalizada para distribuições. A alteração de código é localizada.
2. `QA/test_firebase_distribution_commit_nov2026.cjs` — regressão ampliada com estrutura legada realista.
3. `LEIA_PRIMEIRO_HOTFIX_CONFLITO_DISTRIBUICAO_20261111.md` — documentação.

**Não alterar diretamente:** dados, permissões, regras, configurações ou arquivos oficiais do Firebase.

**Rollback:** restaurar `index.html` e `QA/test_firebase_distribution_commit_nov2026.cjs` da revisão anterior, fornecidos em ZIP separado. Rollback de código não reverte valores ou históricos gravados pela operação no Firebase.

## Decisão do Board

Solicita-se autorização explícita para publicar **somente os três arquivos do pacote candidato** no GitHub oficial, em um único commit e sem alterações diretas no Firebase. Homologação operacional permanece pendente.

