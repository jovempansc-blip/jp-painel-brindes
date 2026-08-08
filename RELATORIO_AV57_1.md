# Validação funcional AV-57.1

A revisão consolida as pendências levantadas após a AV-57. O foco foi operação do locutor, rastreabilidade e controle OPEC.

## Estúdios
- sino de pendências sem lista permanente;
- contador de ocorrências ainda abertas;
- separação AGORA / ATRASADAS;
- confirmação normal continua alimentando `readLog`;
- `NÃO REALIZADA` exige motivo e alimenta `missedLog`;
- múltiplas leituras por hora são encerradas ocorrência a ocorrência;
- o botão concluído mantém letreiro de confirmação;
- código duplicado AV-56/AV-57 do rodapé foi removido.

## OPEC
- campanha pode ser pausada e reativada mantendo histórico;
- exceção pontual permite fixar uma ocorrência do rodízio em uma data/programa/horário;
- alteração de regra exige motivo;
- histórico da campanha mostra planejamento, confirmações, falhas justificadas, exceções, pausas e alterações;
- CSV inclui motivo/justificativa.

## Compatibilidade
Os novos campos são aditivos (`missedLog`, `opecPausePeriods`, `opecOverrides`) e preservam os registros AV-57 existentes.
