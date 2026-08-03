# JP Workspace V56.10 — relatório de implantação

## Correção do salvamento de ganhadores V56.10

- Corrigido o erro `Invalid token in path` apresentado ao confirmar o nome do ganhador no Estúdio JP 101,7.
- A causa era a reconstrução do mapa do Banco de Ganhadores usando o campo histórico `id` como se ele fosse a chave física do Firebase.
- IDs legados podem conter pontuação aceita no conteúdo de um registro, mas proibida em chaves do Realtime Database.
- O sistema agora preserva a chave física original de cada registro e mantém o `id` histórico apenas como dado.
- Registros novos continuam recebendo chaves automáticas válidas geradas pelo Firebase.
- Edição, exclusão e restauração no Painel Principal foram alinhadas para usar a chave física válida do registro.
- Nenhum nome, data, programa, prêmio, bloqueio ou registro do histórico é renomeado ou removido.
- Validação automatizada concluída com 161 testes e nenhuma falha, incluindo reprodução de ID legado com `.`, `#`, `[`, `]` e `/`.

## Banco de clientes e alternância de textos V56.9

- Incluído no OPEC o cadastro de CLIENTE, TIPO DO TEXTO, INÍCIO/FIM DO CONTRATO e INÍCIO/FIM DA VIGÊNCIA DO TEXTO.
- Textos podem ser classificados como INSTITUCIONAL, PROMOCIONAL ou LEGADO.
- O promocional possui vínculo explícito com o institucional que deve retornar ao seu encerramento.
- A decisão do texto é feita em tempo real por cliente, emissora, programa, data e horário; não depende de rotina agendada ou painel aberto.
- Durante a vigência promocional, o institucional equivalente deixa de gerar leitura e não aparece duplicado no Estúdio.
- Encerrada a vigência, o institucional volta automaticamente nos dois Estúdios.
- Incluída a aba CLIENTES E TEXTOS com indicadores, pesquisa, filtros por emissora/tipo/status, versões, vigência, destino, última leitura e ações.
- A partir de um institucional, a OPEC pode abrir um NOVO PROMOCIONAL já com cliente, contrato, programa, horários e retorno preenchidos.
- Incluídos SALVAR RASCUNHO, PUBLICAR, NOVA VERSÃO, ENCERRAR PROMOCIONAL AGORA, ARQUIVAR e REATIVAR.
- Dois promocionais do mesmo cliente não podem ocupar o mesmo programa, horário e período sem uma nova versão identificada.
- Rascunhos, arquivados, cancelados e promocionais encerrados não são enviados aos locutores.
- Cada leitura salva cliente, tipo, versão, título e texto exatos no registro de confirmação.
- Alterações de conteúdo após leituras confirmadas são transformadas em nova versão, preservando a comprovação anterior.
- Cadastros existentes não são modificados automaticamente e aparecem como LEGADO para classificação segura.
- JP 101,7 e JP News 98,3 receberam a mesma resolução institucional/promocional; o Banco de Ganhadores continua exclusivo da JP 101,7.
- Validação automatizada concluída com 156 testes e nenhuma falha.

## Caixa de seleção visível por segmento V56.8

- O campo de modo de cada destino deixou de ter aparência de indicador cinza.
- Cada linha mostra uma caixa branca com seta vermelha e as opções `INDIVIDUAL` e `PAR`.
- Rádio, App, Redes Sociais, Reservado, Externa, Camarote e Camarim continuam sendo configurados de forma independente.
- A largura do campo foi ampliada para exibir `INDIVIDUAL` sem cortar o texto.
- O cálculo e a gravação por destino implementados na V56.7 foram mantidos integralmente.
- Validação automatizada concluída com 139 testes e nenhuma falha.

## Distribuição independente por destino V56.7

- O indicador fixo de unidade foi substituído por um seletor `IND.` / `PAR` em cada destino da nova distribuição.
- Rádio, App, Redes Sociais, Reservado, Externa, Camarote e Camarim podem usar modos diferentes dentro do mesmo prêmio.
- O campo PADRÃO DE ENTREGA define somente o modo inicial dos novos destinos; escolhas já feitas por linha são preservadas.
- O resumo identifica o modo de cada segmento e, quando a distribuição é mista, calcula consumo e saldo em unidades físicas.
- Um registro individual consome uma unidade; um registro em par consome duas unidades.
- O Firebase recebe o modo de cada canal em `ticketUnits`, sem alterar a estrutura dos registros existentes.
- Ao editar uma distribuição, cada destino recupera seu modo salvo, com compatibilidade para registros antigos que possuíam apenas o padrão geral.
- A validação automatizada confirmou troca imediata, persistência, reabertura e cálculo de saldo misto.
- Validação automatizada concluída com 137 testes e nenhuma falha.

## Catálogo restrito e compacto V56.6

- O campo TÍTULO da nova distribuição lista somente títulos únicos que já existem na Distribuição Geral.
- O Banco de Ganhadores continua sendo consultado para localizar o último sorteio, mas não fornece opções ao campo TÍTULO.
- Registros existentes apenas no Excel/histórico de ganhadores foram retirados do Catálogo de Prêmios.
- A escolha de um título conhecido continua carregando automaticamente a descrição padrão correspondente.
- A aba PRÊMIOS passou a mostrar apenas o último sorteio de cada título.
- A descrição da tabela foi limitada visualmente a três linhas; o texto completo permanece disponível em EDITAR PADRÃO.
- As colunas receberam proporções fixas e as ações foram empilhadas para evitar sobreposição.
- Indicadores agora separam títulos com e sem descrição padrão e identificam premiações registradas.
- Validação automatizada concluída com 128 testes e nenhuma falha.

## Catálogo de Prêmios V56.5

- Incluída a aba PRÊMIOS exclusivamente no Painel Principal.
- O catálogo é montado automaticamente a partir das distribuições de todos os meses e dos registros do Banco de Ganhadores.
- Títulos repetidos em meses diferentes são unificados sem apagar ou reescrever os cadastros de origem.
- A descrição histórica mais recente passa a ser a sugestão inicial quando ainda não existe um padrão administrado.
- Ao digitar ou selecionar um título já cadastrado na nova distribuição, a descrição padrão é carregada automaticamente.
- O operador pode editar o texto daquela distribuição; depois da edição, o sistema não substitui o conteúdo silenciosamente.
- Ao salvar uma distribuição, título, prêmio, descrição e estilos passam a alimentar o catálogo central no Firebase.
- A descrição padrão também pode ser alterada diretamente na aba PRÊMIOS. Essa ação preserva integralmente as descrições históricas.
- A aba mostra os últimos sorteios, reunindo corretamente os nomes de 2, 3 ou 4 ganhadores do mesmo resultado.
- A busca global também localiza e abre registros do Catálogo de Prêmios.
- A gravação do catálogo participa da proteção multiusuário já existente, com detecção de conflito por título.
- Validação automatizada concluída com 124 testes e nenhuma falha.

## Correção V56.4 — horários e exceção de rodízio

- O relatório de distribuição oferece todos os horários válidos cadastrados para a data e a emissora.
- Os horários escolhidos no cadastro do prêmio continuam orientando a montagem automática.
- Violações de espaçamento/rodízio exibem confirmação com duas decisões: prosseguir ou voltar para ajustar.
- Horários inexistentes, sem programa ou ocupados continuam protegidos como erros estruturais.
- A confirmação excepcional registra data, motivo e evento de auditoria.
- Validação automatizada concluída com 114 testes e nenhuma falha.

## Correção V56.3 — baixas da Recepção na Diretoria

- A aba RETIRADAS da Diretoria passou a espelhar as baixas individuais registradas pela Recepção.
- Cada ganhador possui sua própria linha, inclusive em sorteios com 2, 3 ou 4 vencedores.
- O filtro RETIRADOS apresenta DATA/HORA DA BAIXA e PRAZO ORIGINAL.
- Ganhadores ainda pendentes permanecem fora do filtro RETIRADOS.
- Validação automatizada concluída com 109 testes e nenhuma falha.

## Correção V56.2 — conexão e limpeza operacional

- Indicador de conexão do Painel Principal atualizado com cores diretas no ponto central: verde Firebase, laranja modo local/conexão e vermelho erro.
- Detecção automática mantida pelo Firebase e reforçada pelos eventos online/offline do navegador.
- Segunda fileira duplicada de filtros removida da Recepção; todos os atalhos necessários permanecem na fileira principal.
- Selos PROMOÇÕES sem conteúdo e FIREBASE removidos dos dois links de Estúdio.
- Validação automatizada concluída com 104 testes e nenhuma falha.

## Correção V56.1 — título nos retornos

- O painel agora prioriza o campo TÍTULO do prêmio vinculado, em vez da categoria genérica como INGRESSO ou CINEMA.
- A regra atende a Home, o sino, a janela de retornos, as confirmações, o reaproveitamento, a Diretoria, os relatórios e a Recepção.
- Na ausência de um título cadastrado, permanece o nome genérico como alternativa segura.
- Corrigida a criação do item realocado para uma unidade retornada.
- Validação automatizada concluída com 88 testes e nenhuma falha.

Data da consolidação: 03/08/2026

## Base utilizada

- Cópia integral atual do repositório `jovempansc-blip/jp-painel-brindes`, fornecida pelo usuário.
- As funções existentes da V55 foram mantidas.
- Arquivos antigos de backup não fazem parte do pacote de implantação.
- A planilha histórica não faz parte do pacote publicado e continua sendo importada pelo Painel Principal.

## Banco de Ganhadores

- 1ª premiação: bloqueio de 28 dias; linha e consulta em cinza durante o bloqueio; após a liberação, situação verde/APTO.
- 2ª premiação: novo bloqueio de 28 dias; linha e consulta em cinza; após a liberação, situação laranja/ATENÇÃO.
- 3ª premiação: bloqueio vermelho por 8 meses corridos; após a liberação, inicia-se novo ciclo.
- O mesmo prêmio não pode ser ganho novamente, mesmo depois do reinício do ciclo.
- Novo nome sem histórico: PRIMEIRA PREMIAÇÃO / APTO.
- Validação individual para um, dois, três ou quatro ganhadores no mesmo horário.
- Nomes, programas e prêmios são gravados em caixa alta.
- Possíveis erros de digitação continuam sendo apresentados para decisão de unificação.
- Importação do Excel permanece incremental e idempotente: registros existentes não são substituídos.
- Linhas incompletas são rejeitadas; linhas identificadas como NÃO SORTEAR ou NÃO SORTEAR MAIS são preservadas como bloqueio manual.

## Não sortear e desbloqueio manual

- NÃO SORTEAR e NÃO SORTEAR MAIS foram unificados.
- O Painel Principal e o Estúdio JP 101,7 podem bloquear e desbloquear ouvintes.
- Toda alteração exige duas confirmações, identificação do operador, data, hora e motivo.
- O desbloqueio manual não apaga histórico e não reinicia prazos automáticos.
- A JP News 98,3 e a Recepção não acessam o Banco de Ganhadores.

## Equivalência de prêmios

- Grupo padrão CINEMA: CINEMA, CINESYSTEM, CINÉPOLIS e CINEPOLIS são tratados como o mesmo prêmio.
- Novos grupos podem ser administrados no Painel Principal.
- Shows e eventos permanecem distintos quando a pauta indica edição ou data diferente.

## Firebase e multiusuário

- Estúdio JP 101,7, Estúdio JP News 98,3, OPEC e Recepção gravam somente o registro alterado.
- As gravações críticas fazem até três tentativas e revalidam o estado mais recente.
- Confirmações ficam bloqueadas sem conexão; não existe fila cega para salvar depois.
- O resultado do Estúdio JP 101,7 e os registros do Banco de Ganhadores usam operação identificada e recuperação restrita à própria tentativa.
- Substituição completa da base permanece restrita às ferramentas de envio/restauração do Backup.
- Firebase SDK padronizado na versão 12.15.0 nas sete páginas.
- Integração antiga com Google Script removida das páginas ativas.

## Administração e rastreabilidade

- Registro do nome do operador e setor nas ações auditadas.
- Lixeira com retenção automática de 30 dias.
- Últimas 10 versões publicadas da programação preservadas.
- Auditoria limitada aos 2.500 registros mais recentes, preservando o comportamento existente.

## Testes executados

- 156 verificações automatizadas: 0 falhas.
- Sintaxe JavaScript das sete páginas.
- Inicialização das sete páginas em ambiente de navegador simulado.
- IDs únicos no DOM, botões identificados e referências locais válidas.
- Regras de 28 dias, terceira premiação, 8 meses e reinício de ciclo.
- Bloqueio permanente do mesmo prêmio.
- Equivalência de cinemas e distinção entre edições de shows.
- Bloqueio manual NÃO SORTEAR.
- Sorteio com quatro ganhadores gravados individualmente.
- Ausência do Banco de Ganhadores na JP News e na Recepção.
- Ausência de gravação do estado inteiro nos Estúdios, OPEC e Recepção.
- Padronização do Firebase SDK e remoção do código legado.
- Catálogo de Prêmios com títulos repetidos entre meses, descrição histórica mais recente e persistência automática.
- Preservação da descrição editada manualmente pelo operador.
- Agrupamento de vários ganhadores no mesmo sorteio e abertura de nova distribuição preenchida pelo catálogo.
- Exclusão de títulos existentes somente no Banco de Ganhadores das opções da Distribuição Geral.
- Exibição exclusiva do último sorteio na aba PRÊMIOS.
- Seleção independente de IND. ou PAR nos destinos da distribuição.
- Consumo e saldo real em distribuição mista, persistência por canal e recuperação na edição.
- Cadastro de cliente, contrato, tipo institucional/promocional e retorno automático.
- Prioridade promocional durante a vigência e retomada institucional após o encerramento.
- Bloqueio de sobreposição, exclusão de rascunhos/arquivados dos Estúdios e preservação da versão efetivamente lida.

## Implantação

1. Gere um Backup completo pela versão atualmente publicada.
2. Substitua no GitHub somente os arquivos presentes neste pacote.
3. Preserve os nomes dos sete arquivos HTML e da pasta `assets`, pois os links atuais dependem deles.
4. Abra o Painel Principal e confirme FIREBASE ONLINE.
5. Teste uma consulta sem confirmar um ganhador no Estúdio JP 101,7.
6. Confirme que a JP News e a Recepção continuam sem acesso ao histórico.
7. A planilha de ganhadores deve ser selecionada dentro de BANCO DE GANHADORES > IMPORTAR EXCEL; não deve ser enviada ao GitHub.
