# Testes reproduzíveis no pacote QA2

Requisitos: Python 3.11+, Node.js 18+, Chromium e `playwright` do Python, instalado no seu ambiente de testes.

Na pasta de código extraída:

```bash
python -m unittest discover -s QA -p test_patch_contract.py -v
node --check assets/jp-reception-result-entry.js
node --check assets/jp-distribution-winner-entry.js
python QA/test_ui_isolado.py
python QA/test_historico_isolado.py
python QA/test_regras.py
```

Os testes de Chromium usam um banco simulado em memória, **não** fazem conexão com Firebase e não substituem testes fim a fim. O instalador de código `aplicar_em_checkout_local.py` é somente para uso em cópia local do checkout; sem `--apply` não grava e, com `--apply`, gera backup. Não execute sobre o diretório oficial do repositório sem nova autorização do Board.
