# JP Workspace V56.14

Painel de Operações Artísticas, distribuição de brindes, pautas de estúdio e Banco de Ganhadores da Jovem Pan Floripa.

Esta versão foi consolidada sobre o conteúdo atual do repositório principal. Consulte `RELATORIO_V56.md` antes da implantação.

## Correção definitiva da Recepção V56.14

- Removido completamente do link da Recepção o token especial `.info/connected` que ainda podia gerar `Invalid token in path` ao confirmar uma retirada.
- A conexão é verificada por uma leitura estática em `savedAt`, sem construir caminhos com nome, prêmio, ganhador ou ID histórico.
- A Recepção localiza primeiro a chave física real do registro no Firebase e executa a transação somente naquele registro.
- IDs históricos com ponto, `#`, colchetes ou barra permanecem apenas como conteúdo e nunca participam do caminho de gravação.
- A baixa altera exclusivamente os campos de retirada do ganhador selecionado, preservando todo o restante do sorteio e evitando regravar a coleção completa.
- Mensagens de falha agora identificam a etapa exata: CONEXÃO, LOCALIZAÇÃO ou GRAVAÇÃO DA RETIRADA.
- A identificação continua automática como RECEPÇÃO, sem solicitar o nome de quem confirmou.
- Todas as funções e dados anteriores foram preservados.

## Estabilidade operacional V56.13

- Corrigida a confirmação de retirada na Recepção, preservando o prêmio como pendente se a gravação oficial não for confirmada.
- Eliminado de todas as páginas ativas o uso incorreto do caminho especial `.info/connected` abaixo da raiz do projeto, origem do erro `Invalid token in path`.
- Estúdio JP 101,7, Estúdio JP News 98,3, OPEC e Recepção agora consultam `.info/connected` diretamente na raiz oficial do Firebase, sem anexá-lo ao caminho dos dados.
- A identificação deixou de pedir o nome de quem está operando: o setor é registrado automaticamente como PAINEL PRINCIPAL, RECEPÇÃO, OPEC, ESTÚDIO JP 101,7 ou ESTÚDIO JP NEWS 98,3.
- A Recepção só altera o cartão na tela depois que o Firebase confirma a baixa, evitando retirada apenas visual em caso de falha.
- Auditoria e atualização de metadados são complementares e não anulam uma retirada ou resultado já gravado com sucesso.
- Chaves de mês são validadas antes de formar caminhos de gravação, inclusive para dados históricos.
- As regras do Banco de Ganhadores, o histórico e todas as funções anteriores foram preservados.

## Correção de conexão V56.12

- Removida do salvamento do Estúdio JP 101,7 a consulta especial `.info/connected`, identificada pela mensagem `ETAPA CONEXÃO: Invalid token in path`.
- A conexão passa a ser confirmada por uma leitura real no caminho oficial `jp-painel-brindes/state`.
- A mudança ocorre antes da consulta e gravação do ganhador, permitindo que as regras de aptidão sejam executadas normalmente.
- A gravação incremental, as travas por ouvinte e todas as regras da V56.11 foram preservadas.

## Correção definitiva V56.11

- O Estúdio JP 101,7 deixou de reprocessar o Banco de Ganhadores inteiro ao confirmar um nome.
- Cada nova premiação é gravada de forma incremental com uma chave automática válida gerada pelo Firebase.
- Uma trava temporária por ouvinte evita duas confirmações simultâneas em computadores diferentes e é removida automaticamente ao final.
- O horário e o Banco de Ganhadores são atualizados em etapas controladas, com limpeza automática se o horário não puder ser confirmado.
- O caminho do mês é validado e montado por segmentos seguros antes da gravação.
- Se houver uma nova falha, a mensagem identifica a etapa exata: conexão, leitura, validação, gravação do ganhador ou gravação do horário.
- O histórico importado não é renomeado, reconstruído ou reenviado durante a confirmação.

## Correção V56.10

- Corrigido o erro `Invalid token in path` ao confirmar ganhadores no Estúdio Jovem Pan 101,7.
- IDs históricos antigos continuam armazenados como dados, mas nunca mais são reutilizados como chave de gravação no Firebase.
- As chaves reais já existentes no Firebase são preservadas, evitando renomeação, duplicação ou perda do histórico importado.
- Edição, exclusão e restauração pelo Painel Principal também usam a chave física válida, sem transformar o ID histórico em caminho.
- A confirmação continua registrando imediatamente o novo ganhador no Banco de Ganhadores e no resultado do horário.
- Incluídos testes de regressão com IDs legados contendo ponto, cerquilha, colchetes e barra.

## Ajuste V56.9

- O OPEC passou a cadastrar cada pauta por CLIENTE e classificar o texto como INSTITUCIONAL, PROMOCIONAL ou LEGADO.
- O período do contrato foi separado da vigência de cada texto.
- Durante a vigência de um promocional, o institucional do mesmo cliente, emissora, programa e horário é suspenso automaticamente.
- Ao terminar o promocional, o institucional volta ao Estúdio sem depender de reativação manual ou de o painel estar aberto.
- Nova aba CLIENTES E TEXTOS com pesquisa, filtros, versões, arquivo, retorno previsto e histórico de utilização.
- Botão NOVO PROMOCIONAL reaproveita cliente, contrato, emissora, programa, horários e texto institucional de retorno.
- Rascunhos e arquivados não aparecem nos Estúdios; conflitos entre promocionais sobrepostos são bloqueados.
- Alterações em textos já lidos geram nova versão e cada confirmação preserva uma cópia exata do título e do texto apresentado ao locutor.
- Registros anteriores permanecem intactos e aparecem como LEGADO até serem classificados pela OPEC.

## Ajuste V56.8

- O modo de cada segmento agora aparece claramente como caixa de seleção branca e editável.
- As opções são exibidas por extenso como `INDIVIDUAL` e `PAR`, com seta vermelha de abertura.
- O campo recebeu destaque ao passar o mouse ou selecionar, eliminando a aparência anterior de indicador cinza bloqueado.
- A lógica independente e o cálculo físico de unidades da V56.7 foram preservados.

## Ajuste V56.7

- Cada destino da distribuição — Rádio, App, Redes Sociais, Reservado, Externa, Camarote e Camarim — permite escolher `IND.` ou `PAR` de forma independente.
- A escolha padrão continua disponível para iniciar novos destinos, mas não substitui uma decisão já feita em outra linha.
- Distribuições mistas passam a mostrar consumo e saldo em unidades físicas: 1 individual consome 1 unidade e 1 par consome 2 unidades.
- O modo escolhido em cada destino é salvo no Firebase e restaurado ao editar novamente o prêmio.
- A validação impede que a combinação de individuais e pares ultrapasse o total unitário disponível.

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

## Ajuste V56.4

- Todos os horários válidos cadastrados na aba HORÁRIOS aparecem para ajuste manual no relatório de distribuição.
- A seleção de rodízio do prêmio continua sendo a referência da sugestão automática.
- Conflitos de rodízio passaram de bloqueio absoluto para alerta com escolha do operador.
- O operador pode voltar e ajustar ou prosseguir mesmo assim.
- Exceções confirmadas ficam registradas na auditoria e nos itens gerados.

## Ajuste V56.5

- Nova aba PRÊMIOS no Painel Principal, formada automaticamente pelo histórico de distribuições e pelo Banco de Ganhadores.
- Cada título mostra a descrição padrão, quantidade de cadastros, último uso e últimos sorteios realizados.
- Ao selecionar um título já existente em uma nova distribuição, a descrição padrão é preenchida automaticamente.
- O texto continua editável; uma alteração manual nunca é substituída silenciosamente.
- A descrição padrão pode ser administrada sem alterar nenhuma descrição histórica.
- Cada nova distribuição confirmada alimenta o catálogo no Firebase automaticamente.

## Ajuste V56.6

- O catálogo e a lista do campo TÍTULO agora usam exclusivamente títulos existentes na Distribuição Geral.
- Prêmios presentes somente no histórico importado de ganhadores não aparecem mais como opções de nova distribuição.
- Cada título aparece uma única vez e continua carregando automaticamente sua descrição padrão.
- A aba PRÊMIOS mostra somente o último sorteio realizado de cada título.
- Descrições longas foram compactadas em três linhas e os botões passaram a ocupar uma coluna própria, sem sobreposição.
- Indicadores foram ajustados para títulos da distribuição, descrições pendentes e premiações registradas.
