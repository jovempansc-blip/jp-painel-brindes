# JP Workspace V56.3

Painel de Operações Artísticas, distribuição de brindes, pautas de estúdio e Banco de Ganhadores da Jovem Pan Floripa.

Esta versão foi consolidada sobre o conteúdo atual do repositório principal. Consulte `RELATORIO_V56.md` antes da implantação.

## Ajuste V56.1

- Alertas de retorno exibem o título completo do prêmio na Home, no sino, nos cartões, nas confirmações e na realocação.
- Diretoria, relatórios e Recepção também usam o título completo nas informações de retirada, sem ampliar o acesso da Recepção.
- Cadastros antigos sem título continuam usando o nome genérico como alternativa.
- Realocação de prêmio retornado corrigida para registrar uma unidade sem depender de dados inexistentes.

## Ajuste V56.2

- Bolinha do Painel Principal: verde no Firebase, laranja em conexão/modo local e vermelha em erro.
- Identificação automática pela conexão real do Firebase e pelos eventos online/offline do navegador.
- Recepção com apenas uma fileira de indicadores/filtros; VENCE HOJE foi preservado.
- Removidos dos dois Estúdios os selos PROMOÇÕES sem pauta e FIREBASE, sem retirar a sincronização interna.

## Ajuste V56.3

- Aba RETIRADAS da Diretoria alinhada com os registros da Recepção.
- Filtro RETIRADOS mostra a data e a hora da baixa e o prazo original de retirada.
- Sorteios com vários ganhadores são exibidos e contabilizados individualmente.
- Quem ainda não retirou não aparece no filtro RETIRADOS, mesmo que outro ganhador do mesmo horário já tenha retirado.
