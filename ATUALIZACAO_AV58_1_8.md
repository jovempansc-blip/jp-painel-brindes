# JP Workspace — AV58.1.8

## Plano de execução

Base: versão atual do pacote AV58.1.7, atualizada em 09/10/2026. Preservar os ajustes já implementados de promoções e ganhadores.

1. Reproduzir consultas completas repetidas no Estúdio. Testar conexão ociosa e chamadas simultâneas; remover o critério de ausência de alterações e compartilhar a leitura em andamento.
2. Remover a leitura REST completa paralela na inicialização da Direção. Preservar REST como recuperação quando o SDK falhar.
3. Usar a conexão ativa como verificação preliminar de disponibilidade; manter confirmação por transação/gravação real. Não adicionar armazenamento operacional local.
4. Compactar os indicadores do catálogo de Prêmios e filtrar a situação da descrição e do histórico de sorteios.
5. Compilar todos os scripts, executar os testes de regressão, conferir o pacote e salvar a atualização.

## Limites de validação

Os testes são locais. Não publicar, não gravar na base de produção e não afirmar redução medida de latência sem teste na rede da rádio.

O carregamento inicial dos meses anteriores permanece necessário nesta estrutura para localizar prêmios vigentes, resultados pendentes e campanhas que atravessam meses. Restringi-lo por mês sem um índice de vigência poderia ocultar esses registros.


## Alterações desta entrega

- Estúdio: remove recarga completa motivada apenas por 18 segundos sem alterações; chamadas simultâneas de recuperação compartilham a mesma consulta.
- Estúdio e Direção: assinaturas canceladas são removidas e recriadas durante a recuperação, sem duplicar as assinaturas restantes.
- Estúdios 101,7 e News e Direção: leitura inicial aproveita a assinatura ativa, evitando GETs adicionais aos mesmos nós.
- Direção: inicia pelo SDK; REST permanece como recuperação de falha. Uma falha na verificação de conexão permite nova leitura.
- Estúdio, Recepção e OPEC: conexão já ativa dispensa consulta preliminar a savedAt. Transações e confirmações reais das operações permanecem obrigatórias.
- Prêmios: indicadores menores e filtros com/sem descrição e com/sem sorteio registrado, combinados à busca e à ordenação. Catálogo mantém função de histórico, sem inventar status de campanhas para títulos reutilizáveis.
- CSS: URL versionada para carregar a folha atualizada após a substituição.

## Alterações preservadas da base atual

Campos configuráveis apenas para promoções, ganhador principal e acompanhantes, registro parcial pelo Instagram, complementação dos dados e exigências anteriores à retirada; caixa compacta de resultado; consulta de promoções ativas sem piscar; sinalização de leituras da hora; janela compacta de pendências; regras de meses e históricos existentes.

Não foram refeitas nem alteradas as funções de armazenamento de ganhadores, estoque ou distribuição nesta entrega. Nenhuma regra de banco foi substituída.

## Verificação realizada

26 verificações de regressão passaram: conexão ociosa, leitura simultânea, filtros do catálogo, conexão preliminar, recuperação da Direção e assinaturas canceladas. Os seis scripts internos foram compilados com Node.js. A revisão identificou um risco de assinatura cancelada; foi corrigido e incluído nos testes.

Não foi possível executar a inspeção visual automatizada: o ambiente não dispõe de navegador Chromium. Não houve validação conectada à base real nem medição da latência na rede da rádio. As verificações desta versão não equivalem aos 134 casos citados na documentação anterior: essa suíte anterior não estava no ZIP recebido.

Para executar os testes locais, com Node.js instalado, rode os arquivos .cjs da pasta tests. Os testes utilizam memória e não se conectam ao Firebase.

## Aplicação

Substitua os seis arquivos HTML e assets/av58-admin.css pelos arquivos deste pacote. Mantenha os demais arquivos da pasta assets que já estão no site, especialmente bg-estudio.jpg, logo-workspace-jp.png e logo-workspace-jp-transparent.png: essas imagens não vieram no ZIP de origem.

O pacote não foi publicado. A estrutura dos dados e os caminhos do Firebase permanecem os mesmos. Guarde a versão anterior para eventual retorno.
