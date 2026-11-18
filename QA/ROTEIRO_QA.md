# QA A09 — critérios de homologação

- [ ] Abertura em navegador, sem erros no Console ou bibliotecas não carregadas.
- [ ] Estúdio salva 1 de 3 nomes, status parcial; complementa os outros 2 sem sobrescrever dados.
- [ ] Recepção salva novo ganhador e completa telefone/CPF/acompanhantes; valida persistência após reload.
- [ ] Distribuição permite selecionar promoção de outro mês e adicionar ganhador na ocorrência correta.
- [ ] Operação de salvamento duplicada é recusada, inclusive entre dois computadores.
- [ ] Recepção PROMOÇÕES só em vigência; HISTÓRICO recebe encerradas e preserva a ficha de retirada.
- [ ] Uma promoção encerrada e fixada não retorna indevidamente a PROMOÇÕES.
- [ ] Prêmios em pares/unidades preservam as cotas; registro de nome não consome cota novamente.
- [ ] Retirada com dados obrigatórios incompletos permanece bloqueada; retirada válida confirma uma única vez.
- [ ] Banco Central, ocorrências, resultados e logs usam IDs correspondentes; sem cadastros soltos.
- [ ] Falha Firebase/regras/cancelamento não relata sucesso.
- [ ] Seguranca e proteção de PII auditadas; usar somente banco de testes com dados fictícios.
- [ ] Rollback da interface testado, preservando registros.

**Não marcar como concluído antes dos testes ponta a ponta.**
