# JP WORKSPACE — AV58.1.12 — HOMOLOGAÇÃO

**Data:** 12/10/2026  
**Base:** pacote `JP_WORKSPACE_AV58_1_11_HOMOLOGACAO.zip` fornecido nesta conversa.  
**Objetivo:** encerrar a promoção no Principal ao confirmar o último sorteio e manter a obrigação de retirada na Recepção, inclusive após o fim da vigência.

## Arquivos modificados

- `index.html`: promoção passa a constar como **ENCERRADA** quando todas as ocorrências não canceladas estão marcadas como realizadas e contêm evidência de resultado (quantidade efetiva ou data de registro). Se ainda houver sorteios, mantém o estado ativo. Pauta e merchan preservam as condições de vigência originais. Não altera registros no banco nem o cadastro da campanha.
- `preview_recepcao.html`: substituído o filtro exclusivo por vigência por um agrupamento de **promoções, resultados e retiradas**. Campanhas encerradas, arquivadas ou anteriores ao mês atual permanecem quando há ganhadores com retirada pendente. Quando ainda falta resultado de sorteio já previsto, a pendência também permanece. A linha simplificada exibe promoção, prêmio, ganhador e acompanhantes; ao expandir, exibe somente ganhadores ainda não retirados. O clique abre a ficha de retirada existente.

## Regras de exibição

1. **Resultado concluído, retirada pendente:** permanece na lista mesmo depois do encerramento e depois da virada do mês.
2. **Prazo vencido:** destaque vermelho **FORA DO PRAZO DE RETIRADA**. Vencimento isolado não é evidência de reaproveitamento do prêmio; o aviso antigo que declarava retorno à circulação foi removido.
3. **Vários ganhadores:** confirmação retira da lista somente o ganhador correspondente; campanha desaparece da frente depois de todas as retiradas e do último sorteio. As retiradas continuam no histórico e nos filtros existentes.
4. **Dados de acompanhantes:** só exibe nomes efetivamente registrados; se forem exigidos, mas não informados, mostra a pendência sem fabricar dados. Continua usando o mesmo cadastro do ganhador.
5. **Sincronização:** a atualização usa os listeners já existentes de `child_changed` do Firebase; não foi criado polling nem armazenamento local. Evento de atualização foi exercitado em navegador **com Firebase simulado**, não contra a produção.

## Preservação e escopo

- **Nenhuma alteração de esquema no Firebase ou de gravação de ganhador/retirada.** A nova interface apenas consulta o estado já existente; o Principal calcula um novo status visual a partir das ocorrências já gravadas.
- O `preview_recepcao.html` é atualizado junto com o `index.html`; publicar apenas um deles geraria divergência visual de status.
- Todos os demais HTMLs, recursos, testes anteriores e arquivos de documentação da AV58.1.11 ficam intactos, exceto pela inclusão deste documento e `tests/av58-1-12.cjs`.
- Não foi acessado ou alterado o banco operacional, nem houve publicação.

## Verificações realizadas

- Scripts inline nos seis HTMLs: sintaxe validada com Node.
- Testes Node anteriores e `tests/av58-1-12.cjs`: passaram, incluindo conclusão na última ocorrência, manutenção após fim de mês, múltiplos ganhadores, vencimento e retirada individual.
- Inspeção de Recepção em Chromium com dados totalmente fictícios: lista renderizada sem erros JavaScript, sinalização vermelha, nomes de acompanhante, ficha aberta e simulação de listener de mudança atualizando a lista sem F5.
- O teste visual foi montado com Firebase fictício injetado na página: **não valida SDK, regras, conexão nem banco de produção.**

## Antes de substituir os arquivos publicados

1. Exportar e verificar backup restaurável da base de produção, incluindo os meses anteriores e o histórico/banco de ganhadores. Guardar cópia integral do ZIP atualmente publicado.
2. Testar os dois HTMLs juntos, em endereço de homologação, com Firebase isolado ou cópia anonimizada. **A configuração Firebase do pacote aponta para o projeto original**, portanto NÃO usar o pacote diretamente para testes com dados reais.
3. Testar múltiplos resultados, retirada atrasada, preenchimento de acompanhante, duas sessões concorrentes, salvamento e atualização sem F5, virada de mês, controles de acesso e regressões nos outros quatro painéis.
4. Após teste e autorização específica do Board, publicar e verificar em duas máquinas. Em falha, voltar os HTMLs anteriores; mudanças de dados reais não se revertem apenas com troca de HTML.

**Status:** implementação em arquivo, testes locais e visuais simulados concluídos; **publicação e validação em produção não realizadas**. Nenhuma garantia absoluta pode ser dada sem os testes com as permissões e dados reais.
