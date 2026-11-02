# QA — Regularização da virada de mês

**Data:** 02/11/2026
**Base:** `index.html` e `assets/prog-manual.js` publicados e comparados por SHA-256.

## Cenários simulados em JavaScript

| Caso | Esperado | Resultado |
|---|---|---|
| Novembro com distribuições e promoções, porém sem `items` | A primeira programação é gravável | PASS |
| Novembro com `items: []` explícito | A primeira programação é gravável | PASS |
| Mês inteiramente ausente do RTDB | Recusa controlada, sem inventar mês | PASS |
| Prêmio sem distribuição na competência | Bloqueia e preserva estoque | PASS |
| Cota de rádio zerada | Bloqueia sem gastar estoque | PASS |
| Conflito em outra sessão | Recusa sobrescrita | PASS |
| Regras de regularização retroativa anterior | Continuam presentes | PASS |

**Verificação adicional:** `node --check assets/prog-manual.js` = PASS.

**Não executados:** teste autenticado no Firebase HML, teste cruzado com estúdio e teste concorrente real de duas sessões. Esses testes são necessários para a homologação integral.

**Parecer A09:** correção pontual aprovada em teste simulado. Exigir validação real ou autorização excepcional do Board para publicar sem ela.
