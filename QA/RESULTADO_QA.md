# QA — Promo Externa AV58.1.44

## Resultado do pacote de código
- `test_promo_externa.cjs`: **14/14 PASS** — reserva de 50 pares, cota física 100 ingressos, divisão entre ações, janela temporal, consumo por ganhador, privacidade, recebimento, sem duplo desconto, concorrência simulada, data/hora e preservação de ações em edição do prêmio.
- `test_security_contract.cjs`: **10/10 PASS** — gravações bloqueadas sem liberação A09, telas sem Firebase de produção embutido, dados pessoais fora de `state`, confirmação via Banco Central e proteção do módulo de Recepção.
- Sintaxe de 6 scripts adicionais: **PASS** (`node --check`).
- Sintaxe de scripts inline dos 4 HTMLs: **PASS**.
- Renderização de navegador local: **não executada** porque a ferramenta de navegador bloqueou a navegação `file://` e `http://127.0.0.1`; verificações estáticas de HTML concluídas.

## Evidências e ressalvas
- Fonte do Principal: SHA-256 original `8d630ad9b55293afe8c80d4b4639d7c81f78a733c99793fb85861c8ccec6a401` (igual ao GitHub Pages na consulta read-only).
- Não houve gravações de teste em HML, porque falta sessão autenticada e banco responde 401.
- Não houve alterações de GitHub, produção ou regras de segurança.
- Dois endpoints sensíveis do Firebase de produção responderam 200 sem autenticação. **Risco crítico de privacidade — não publicar.**
- A integração com o Banco de Ganhadores exige verificação das regras e permissões e confirmação do caminho utilizado pela Recepção real.

**Definição de pronto:** implementação em código local pronta para avançar à homologação; funcionalidade operacional real **NÃO** homologada nem liberada.
