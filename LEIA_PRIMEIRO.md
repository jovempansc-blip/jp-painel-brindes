# JP WORKSPACE — IMPLEMENTAÇÃO REAL DA PROMO EXTERNA

**Pacote:** AV58.1.44 / Candidato de homologação — 11/11/2026  
**Autorização:** o Board aprovou a **implementação**, não a publicação em produção antes de homologação final.  
**Status:** código criado e validado localmente. **Não implantado** no GitHub, Firebase ou em qualquer painel real.

## Entregas implementadas

1. **Painel Principal (`index.html`)**: nova aba **Externa** no padrão do JP Workspace, formulário com nome da ação, prêmio já cadastrado, início, término e quantidade retirada da cota Externa; tabela das ações e respectivos ganhadores. Ao editar a distribuição, o código protege ações existentes contra alteração de unidade ou redução de cota abaixo do reservado.
2. **Locutor (`promo_externa.html`)**: nova página no visual claro do Estúdio Jovem Pan. Lista apenas ações ativas, mostra cota, utilizado e saldo, registra nome e telefone no Banco de Ganhadores e deduz uma unidade de entrega da ação por registro. A competência e o ID da distribuição são preservados. Data/hora vêm do `firebase.database.ServerValue.TIMESTAMP` e são exibidas em horário de Brasília.
3. **Recepção (`recepcao_externa.html`)**: lista em tempo real os ganhadores a retirar, com ação, prêmio, quantidade, data/hora do registro e baixa. Dar baixa altera o estado do ganhador uma única vez e **não consome estoque novamente**.
4. **Recepção existente no repositório (`preview_recepcao.html`)**: adicionada a seção **Promo Externa · Ganhadores e Retiradas** usando o mesmo dado e o mesmo botão de baixa, com bloqueio de segurança. Atenção: esse HTML contém um controlador HML que exige validação da rota realmente utilizada pela recepção operacional.
5. **Banco Central**: dados pessoais **não são gravados na distribuição**. O cadastro é preparado no ramo `winnerBank/pendingExternal`, confirmado por ID fixo em `winnerBank/records/EXTERNA_<id>` e reconciliado com o registro do prêmio. Falhas deixam status pendente para conciliação, impedindo retirada até confirmação.
6. **Estoque**: ações e ganhadores vivem juntos no registro da distribuição da competência de origem. As alterações ocorrem por transação no nó `months/<mês>/distributions`, para impedir consumo acima da cota com dois locutores trabalhando ao mesmo tempo.

## Alerta crítico A09 — segurança

Na auditoria read-only, os endpoints **`/jp-painel-brindes/state/months/2026-11` e `/jp-painel-brindes/winnerBank/records` responderam HTTP 200 sem autenticação**. A base já oferece leitura de dados pessoais sem proteção adequada. Para não ampliar essa exposição, **a nova funcionalidade permanece em `WRITE LOCK`**, e nenhum cadastro é gravado enquanto a configuração `JP_EXT_SECURE_BANK_VERIFIED` não for explicitamente validada pelo A09 em ambiente HML. Esta configuração é `false` por padrão e as páginas independentes também ficam com `JP_EXT_FIREBASE_CONFIG=null`.

**Não habilitar a flag sem antes ajustar, auditar e testar as regras e permissões do Firebase.** Alterações de regras não estão autorizadas neste pacote e exigem nova decisão do Board.

## Limites técnicos pendentes da homologação

- Confirmar acesso autenticado ao banco `jp-workspace-av60-hml` (última consulta retornou 401); identificar o caminho real, obter backup e validar permissões antes de testes de escrita.
- Validar as regras RTDB que protegem os ramos `state` e `winnerBank`, inclusive a nova área `pendingExternal`, com autenticação por operador e permissões por papel.
- Testar em duas sessões reais: 50 pares alocados, dois ganhadores concorrentes, tentativa de excesso de saldo, baixa única, bloqueio de duplicidade e recuperação de falha na sincronização do banco.
- Verificar a **rota da Recepção realmente usada na emissora** e a ativação do controlador atual de `preview_recepcao.html`, antes de considerar a integração concluída.
- Validar procedimento de cancelamento de ganhador antes da retirada, reconciliação de resultados com Banco Central e edição/cancelamento administrativo de ações.
- Confirmar que demais módulos de prêmio não recriam/corrompem `externalActions` ao realizar operações legadas; há bloqueios preventivos na edição do Principal, mas falta QA ponta a ponta.
- Não habilitar a produção enquanto os testes de autorização, privacidade, auditabilidade e saldo não forem aprovados.

## Arquivos a adicionar/alterar em futura publicação aprovada

**Alterados:** `index.html` e `preview_recepcao.html` (não substituir outros arquivos legados).  
**Novos:** `promo_externa.html`, `recepcao_externa.html`, `assets/jp-promo-externa-core.js`, `assets/jp-promo-externa-firebase.js`, `assets/jp-promo-externa-main.js`, `assets/jp-promo-externa-pages.js`, `assets/jp-promo-externa-reception-bridge.js`, `assets/jp-promo-externa.css`, `assets/jp-promo-externa-env.js`.  
**Referência visual:** logo oficial na pasta `assets/`, já existente no site.

Este ZIP é um **pacote incremental**: os demais arquivos e assets do repositório permanecem intactos. `ROLLBACK/` contém os dois HTML originais, que poderão ser restaurados após publicação autorizada.

## Parecer executivo

**A08:** núcleo, telas e integração em código implementados; lógica de saldo, data/hora e baixa preparada.  
**A09:** testes locais aprovados; **REPROVA PUBLICAÇÃO** até saneamento de leitura pública, autenticidade do Firebase HML e E2E da Recepção.  
**A01:** continuar pela homologação sem tocar na produção. Após conclusão, apresentar ao Board a decisão de liberação, com escopo exato, relatório QA e rollback.
