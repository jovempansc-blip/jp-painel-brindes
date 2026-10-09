# JP Workspace — desprogramação por prêmio

Escopo aprovado: X nas duas visualizações da Distribuição, opção pelo botão direito no cartão da Programação, dia específico, intervalo, mês selecionado ou todo o período. Prévia mostra horários e datas antes da confirmação. Vínculos ocultos pelos filtros devem ficar acessíveis.

## Implementação

1. assets/distribution-unprogram.js: planejamento puro por IDs reais, período inclusivo, proteção de resultados/ganhadores e verificação de alterações concorrentes. Testar todos os períodos, canais fora da grade, cópias em meses distintos e alterações após a prévia.
2. index.html e assets/av58-admin.css: janela Glass Suave, X, menu de contexto e lista de vínculos. Preservar o ajuste de horário pelo botão direito no horário. Limpar filtros ao abrir a grade por prêmio.
3. Aplicar transação por competência. Cada transação revalida os horários na base real e guarda uma cópia dos itens removidos no histórico daquela competência. Depois, espelhar os removidos na lixeira e registrar auditoria. Se um mês falhar, informar o que foi confirmado e o que restou; não declarar um retorno de gravações já confirmadas.
4. Validar scripts, testes anteriores e novos; revisar a alteração; entregar pacote completo sem publicar.

## Regras

- Não excluir prêmio ou alterar cota ao desprogramar; os contadores são recalculados pelos itens restantes.
- Não remover sorteios realizados, registros com ganhadores/retiradas, itens cancelados ou resultados originados de promoção. Resultados de promoção precisam ser alterados no cadastro da promoção para que não sejam recriados pela rotina de resultados.
- Mostrar promoções vinculadas separadamente, com acesso ao cadastro. A desprogramação não encerra automaticamente uma campanha.
- IDs agrupados na linha da Distribuição são incluídos explicitamente na consulta. Não identificar prêmios por mera igualdade de nome.
- Transação remove apenas registros exibidos na prévia que continuem com os mesmos dados e sem resultados. Novos horários e alterações concorrentes permanecem intactos.
- Firebase permanece a fonte dos dados; nenhum armazenamento operacional em localStorage.
