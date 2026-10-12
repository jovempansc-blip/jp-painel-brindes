# JP Workspace — AV58.1.11 — Entrega para validação controlada
Data: 12/10/2026

## Origem e escopo
Base informada como em operação: `jp-painel-brindes-main(2).zip`. O pacote original contém documentação AV58.1.10. Não houve leitura, escrita, publicação ou atualização de registros no Firebase de produção durante esta preparação.

A AV58.1.10 fornecida já inclui cadastro configurável de ganhadores e acompanhantes nas promoções, resultado parcial, complementação dos registros e consulta na Recepção. Essas rotinas foram preservadas.

## Arquivos alterados (somente dois)
1. `index.html` (Principal): opção visual **IDENTIFICAR ACOMPANHANTES** ao cadastrar uma promoção com acompanhantes. Ao ativar, quando nenhum dado havia sido selecionado, o nome do acompanhante passa a ser solicitado **antes da entrega**, permitindo registrar resultados parciais. Ao desativar, nenhum campo do acompanhante é solicitado; a quantidade autorizada continua registrada. Mantida a mesma estrutura do objeto `winnerRegistration`, sem migração de banco.
2. `painel_pauta_estudio_jovem_pan_GITHUB_API.html` (Estúdio 101,7): sino dos próximos sorteios deixa de integrar o pisca-alerta; somente P e M piscam quando há leituras da hora atual ainda não confirmadas. Avisos compactos na parte inferior da área do Estúdio identificam leituras de pauta ou merchan pendentes e abrem a lista correspondente. Avisos somem quando não há leitura pendente. Leituras antigas permanecem acessíveis sem alerta visual, conforme regra já existente.

Os demais arquivos HTML, CSS e recursos da base fornecida foram preservados. As regras de retirada, histórico e registros de resultados já presentes na base não foram modificadas. Adicionado teste isolado `tests/av58-1-11.cjs`.

## Verificação local — não equivale a produção
- Sintaxe de scripts inline: seis HTMLs, sem erros de análise.
- Dez arquivos de testes Node: passaram (os nove anteriores mais o teste AV58.1.11).
- Tentativa de inspeção visual em Chromium: **bloqueada pela política do ambiente** inclusive nas páginas locais. Não alegar teste de navegador concluído.
- **Firebase real, regras de segurança, concorrência em duas máquinas, atualização sem F5, notificações em produção e tempos de resposta:** não verificados nesta entrega.

## Procedimento obrigatório antes de publicação
1. Exportar **backup completo e restaurável** da base operacional e verificar que o arquivo foi gerado (incluindo meses e banco de ganhadores). Guardar o ZIP publicado anterior. Não enviar dados pessoais em conversas ou relatórios.
2. Implantar a AV58.1.11 em ambiente de teste com **banco Firebase isolado ou cópia anonimizada e regras adequadas**, nunca usar os caminhos e a configuração de produção para testes que gravem dados. Importante: os HTMLs do pacote preservam a configuração Firebase original.
3. Testar cadastro de promoção com 0 e com 3 acompanhantes, opção de identificação ligada/desligada, dados opcionais e obrigatórios antes da entrega, promoção antiga sem regras, resultado parcial e complementação pela Recepção.
4. Em duas sessões, confirmar leituras simultâneas, registrar o mesmo resultado, completar ficha e baixar retirada; conferir ausência de perdas, duplicações e alterações no histórico e estoque. Verificar virada de horário/mês e atualização sem F5 nos painéis necessários.
5. Conferir que o sino não pisca; P/M e avisos inferiores aparecem apenas para leituras válidas da hora atual. Clicar e confirmar; confirmar desaparecimento do alerta. Testar atrasadas sem destaque piscante.
6. Somente após os testes e autorização final do Board, publicar os dois HTMLs alterados. Confirmar carregamento da versão e manter plano de retorno aos arquivos anteriores. Alterações em dados não podem ser revertidas somente trocando HTMLs.

**Classificação:** pacote entregue para homologação; não publicado por esta entrega; nenhuma garantia de inexistência de erro em produção antes dos testes descritos.
