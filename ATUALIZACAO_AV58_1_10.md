# AV58.1.10 — Desprogramação por prêmio

## Instalação
Atualize index.html e copie os arquivos assets/av58-admin.css, assets/distribution-unprogram.js e assets/distribution-unprogram-ui.js para a mesma pasta assets do site. Preserve os logos e fundos existentes. O pacote inclui os seis painéis e as correções anteriores. Esta entrega não foi publicada no site nem executada no Firebase de produção.

## Uso
Na Distribuição, clique no X do prêmio. Na Programação, use o X das ações ou o botão direito sobre a caixinha. Escolha um dia, um intervalo inclusivo, a competência selecionada ou todo o período. Confira a quantidade e as datas antes de confirmar. Ver vínculos mostra também canais, horários e competências que não aparecem nos filtros da grade.

A operação remove somente horários pendentes sem resultado. Sorteios realizados, ganhadores, retiradas, itens cancelados e resultados vinculados a promoções permanecem preservados. Para vínculos de promoção, use ABRIR para revisar o cadastro. Desprogramar não exclui automaticamente o prêmio nem altera sua quantidade cadastrada; depois, revise os vínculos restantes antes de excluir ou gerar nova programação.

A gravação utiliza transações por competência e verifica se os horários mudaram desde a prévia. Cópias dos horários removidos ficam no backup técnico unprogramHistory de cada competência e são espelhadas na Lixeira e auditoria. Falhas parciais são informadas, sem anunciar conclusão de meses não confirmados. Se o espelhamento falhar, as cópias continuam no backup técnico, acessível pela exportação dos dados.

## Validação
Passaram os nove arquivos de testes locais, incluindo concorrência, preservação de resultados, eventos recebidos durante a operação, falha parcial, ausência de conexão e regressões anteriores. Sintaxe JavaScript validada nos seis HTMLs e nos novos scripts. A interface não foi validada em navegador nesta entrega; os testes de integração usam Firebase simulado.
