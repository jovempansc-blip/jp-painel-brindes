# JP BOARD ROOM — Publicação conjunta Estúdio 101.7 + OMR

Data: 16/11/2026
Autoridade: Board autorizou publicar as duas correções juntas.
Revisão-base: dc35fb0eb2cc3e688baedbb06258290e4d0efab2.

## Escopo e objetivo

1. **Estúdio Jovem Pan 101.7:** reduzir leituras e reprocessamentos desnecessários de todo o Banco de Ganhadores, preservar bloqueios de duplicidade, acelerar validação durante digitação, apresentar motivos de bloqueio/erro e preservar o rascunho quando não houver gravação confirmada. O resultado de uma transação confirmada é comparado com os nomes solicitados antes de comunicar sucesso. Divergências confirmadas exigem conciliação, sem repetir cadastro. Auditoria complementar pendente é avisada separadamente. Nenhuma mudança de quantidade, premiação, agendamento ou regra de sorteio.
2. **OMR:** exigir sinal real `.info/connected` do Firebase antes de gravar/apagar; mostrar falhas de SDK e de conexão; evitar oscilação de status em quedas curtas; corrigir exclusão de merchan através de transação no registro exato da competência (não reescreve grandes coleções com imagens). Quando há várias competências, exigir escolha explícita entre COMPETENCIA e TUDO, confirmação irreversível e auditoria. Manter os registros de outras campanhas; preservar índices dos registros após remoções. Informar exclusões parciais, auditoria ou conferência pendentes.
3. **Integração:** um único commit GitHub para os dois HTML; nenhuma escrita, remoção, migração ou mudança de regra diretamente no Firebase durante a publicação.

## QA A09
- Estúdio: 8 verificações de streams de históricos e bloqueios + 1 fluxo de winner bank e promoção + 18 verificações de elegibilidade, recibos e alertas + 6 cenários completos de transação = 33.
- OMR: 15 casos de exclusão mensal/múltipla, preservação de outros cadastros e falhas parciais + 6 cenários de conexão real + 5 cenários de índices esparsos = 26.
- Total: **59 testes simulados aprovados**, 0 falhas. Sintaxe de JS, HTML IDs e CSS dos dois painéis aprovados.
- Não houve teste de exclusão real, cadastro real ou escrita no Firebase oficial.

## Riscos residuais
- O OMR continua recebendo snapshots mensais completos usados pelo planejamento inteligente, alguns com imagens incorporadas. A presente correção evita regravar essas coleções durante a exclusão, mas não elimina todo o tráfego. Índice `kind` e consultas de planejamento leves demandam futura homologação de regras e arquitetura.
- O Firebase permanece no modo piloto com as permissões já existentes; esta publicação não amplia nem restringe acesso. Usar somente dados fictícios enquanto o acesso administrativo e as regras não forem endurecidos.
- A confirmação ponta a ponta no Firebase e na Recepção precisa de um teste operacional controlado, explicitamente autorizado se implicar gravações reais.

## Rollback
- Em caso de regressão, restaurar apenas `painel_pauta_estudio_jovem_pan_GITHUB_API.html` e `merchan_radios.html` da revisão-base `dc35fb0eb2cc3e688baedbb06258290e4d0efab2`.
- Não apagar nem restaurar automaticamente cadastros reais: rollback de código não é rollback de dados.
- O botão de exclusão OMR só provoca uma exclusão após escolha e confirmação explícitas do operador.

## Checklist de homologação pós-publicação (sem ações destrutivas)
- Confirmar que ambos os HTML e scripts são servidos na versão publicada (comparação por hash).
- Estúdio: verificar carregamento do histórico, estados de bloqueio e status de conexão, preservando entrada digitada.
- OMR: verificar indicação de conexão; abrir ficha existente sem excluir; confirmar que a caixa de diálogo diferencia mês e todas as competências.
- Para testar uma gravação ou exclusão de fato, preparar operação fictícia autorizada e backup prévio específico, sem atuar em registros existentes de clientes.
