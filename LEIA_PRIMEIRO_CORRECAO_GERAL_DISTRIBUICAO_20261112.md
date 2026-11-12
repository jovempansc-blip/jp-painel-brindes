# JP Workspace — Correção geral de gravação de distribuições em múltiplas competências

**Status:** candidato de homologação. **NÃO publicado no GitHub. Nenhuma gravação efetuada no Firebase.**  
**Base oficial:** commit `31b55bb7ea5eb43ba46935e94c7c4539cc99cc15`, branch `main`, repositório `jovempansc-blip/jp-painel-brindes`.

## Falha confirmada

O painel possuía dois caminhos de persistência:

- **Uma competência:** verificava corretamente distribuições legadas normalizadas.
- **Duas ou mais competências:** enviava um rótulo de contexto `MÊS 2026-10 / distributions` à função de verificação, que reconhecia apenas o formato técnico `months/2026-10/distributions`. A função então voltava à comparação rígida de JSON bruto. Campos opcionais preenchidos ao carregar o painel eram interpretados como alterações de outra sessão, bloqueando a gravação.

Esse problema é **geral para qualquer prêmio com múltiplas competências e registros antigos equivalentes**, não restrito a um nome de prêmio. A correção atua na camada comum `persistGranularState`.

## Correção exata

Em `index.html`, na ramificação de escrita multimês, o argumento de contexto de `applyCollectionPlanToRows` passa a ser o caminho normalizado `months/${key}/${collection}` em vez do rótulo de apresentação `MÊS ${key} / ${collection}`.

Não houve mudança no cálculo de saldo, conversão individual/par, regras de programação, estoque, histórico, recepção, promoções externas ou configuração Firebase.

## QA: reprodução antes/depois

A nova suíte `QA/test_distribution_multimonth_nov2026.cjs` cobre prêmios entre outubro e novembro, campanhas de três meses, brindes individuais, independência entre prêmios e conflitos legítimos de outra estação.

| Verificação | Versão oficial anterior | Candidato corrigido |
|---|---|---|
| Nova suíte multimês | **8 PASS / 4 FAIL** | **12 PASS / 0 FAIL** |
| Testes dirigidos adicionais | Não modificados | **124 PASS** |
| Total de execuções dirigidas | — | **136 PASS** (inclui sete cenários repetidos nas duas suítes de persistência) |
| Testes legados | **21 PASS / 8 FAIL** | **21 PASS / 8 FAIL** |
| Sintaxe JavaScript | — | PASS |

A suíte antiga tinha oito falhas preexistentes não associadas a essa alteração. Os testes novos usam **Firebase simulado**, não a base real.

## Como homologar sem duplicar estoque

1. Após autorização e publicação, confirme que o deploy de `main` foi concluído com sucesso e atualize a página sem cache.
2. Escolha um prêmio que tenha cadastro em mais de um mês e confira estoque, cota e histórico atuais **antes de acrescentar qualquer unidade**.
3. Registre um lote real ainda não gravado, com origem, competência e quantidade física, uma única vez.
4. Salve; recarregue a página e confira que estoque, cota e histórico continuam corretos.
5. Destine as unidades livres ao canal Rádio, caso seja essa a finalidade, e salve novamente.
6. Verifique disponibilidade de programação manual e automática, com dedução dos horários já programados.
7. Repita as verificações com brinde individual e prêmio de um único mês em base isolada.
8. Teste conflito entre dois operadores sem comprometer registro real.

**Atenção:** se algum lançamento não foi confirmado e outro operador o repetiu, reconcilie o histórico e o estoque com a base antes de fazer outro recebimento. Nunca some novamente as mesmas unidades sem conferência.

## Arquivos do pacote candidato

1. `index.html` — uma única alteração de linha no código de persistência.
2. `QA/test_distribution_multimonth_nov2026.cjs` — 12 testes simulados, cinco cenários novos mais sete controles anteriores.
3. `LEIA_PRIMEIRO_CORRECAO_GERAL_DISTRIBUICAO_20261112.md` — este documento.

**Rollback:** arquivo `index.html` original do commit `31b55bb7ea5eb43ba46935e94c7c4539cc99cc15`. O rollback de código não reverte lançamentos já gravados no Firebase.

## Decisão do Board

Necessária autorização explícita para publicar **somente estes três arquivos** na branch oficial `main`. Não alterar dados, regras, permissões nem configurações Firebase. Após publicar, conferir commit, build, deploy e preservar o status **homologação operacional pendente** até testes reais.
