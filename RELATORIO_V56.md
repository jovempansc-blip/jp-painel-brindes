# JP Workspace V56.1 — relatório de implantação

## Correção V56.1 — título nos retornos

- O painel agora prioriza o campo TÍTULO do prêmio vinculado, em vez da categoria genérica como INGRESSO ou CINEMA.
- A regra atende a Home, o sino, a janela de retornos, as confirmações, o reaproveitamento, a Diretoria, os relatórios e a Recepção.
- Na ausência de um título cadastrado, permanece o nome genérico como alternativa segura.
- Corrigida a criação do item realocado para uma unidade retornada.
- Validação automatizada concluída com 88 testes e nenhuma falha.

Data da consolidação: 01/08/2026

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

- 80 verificações automatizadas: 0 falhas.
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
- Teste real em nó temporário isolado do Firebase: escrita, leitura, atualização e exclusão aprovadas. O nó foi removido ao final.

## Implantação

1. Gere um Backup completo pela V55 atualmente publicada.
2. Substitua no GitHub somente os arquivos presentes neste pacote.
3. Preserve os nomes dos sete arquivos HTML e da pasta `assets`, pois os links atuais dependem deles.
4. Abra o Painel Principal e confirme FIREBASE ONLINE.
5. Teste uma consulta sem confirmar um ganhador no Estúdio JP 101,7.
6. Confirme que a JP News e a Recepção continuam sem acesso ao histórico.
7. A planilha de ganhadores deve ser selecionada dentro de BANCO DE GANHADORES > IMPORTAR EXCEL; não deve ser enviada ao GitHub.
