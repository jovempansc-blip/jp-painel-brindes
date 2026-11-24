# JP Estúdio — QA visual isolado (23/11/2026)

**27/27 testes aprovados**.

- [x] Rodapé criado dentro do cartão do título
- [x] Título original preservado
- [x] Pauta mantida fora do rodapé
- [x] Sem segundo cartão extra
- [x] Ícone de ingresso preservado
- [x] Ícone de relógio preservado
- [x] Contagem visível no rodapé
- [x] 10 minutos informa 10 MIN
- [x] 06 minutos informa 06 MIN
- [x] 05 minutos inicia pulso suave
- [x] No horário mostra RESULTADO AGORA
- [x] Após 1 minuto mantém PENDENTE
- [x] Resultado salvo exibe CONFIRMADO
- [x] Prêmio B selecionado recebe confirmação independente
- [x] Prêmio A não herda a confirmação de B
- [x] 09H30 recebe PRÊMIO DA MEIA HORA
- [x] 09H recebe PRÊMIO DA HORA
- [x] Pauta virtual não recebe rodapé de sorteio
- [x] Sem erros de execução do addon
- [x] Layout 375 px sem barra horizontal
- [x] Instalador injeta CSS e JS sem tocar na lógica
- [x] Instalador idempotente
- [x] Função render original permanece intacta
- [x] Instalador salva cópia temporária sem erro
- [x] Instalador cria backup do HTML
- [x] Instalador copia os dois assets
- [x] Não há escrita nem consulta ao Firebase no addon

## Pendências

- Sem checkout completo montado no ambiente de teste; o aplicador foi validado contra fixture DOM e arquivo de teste.
- Sem teste de sincronização real com Firebase, gravação de resultado, distribuição ou estoque.
- Sem publicação no GitHub Pages; a imagem de referência continua o padrão e a versão do addon é candidata.
- O bloqueio de mais de um prêmio no mesmo minuto permanece na regra de programação do Painel Principal; este pacote é **exclusivamente visual**.
