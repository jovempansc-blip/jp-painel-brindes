# JP WORKSPACE — Correção urgente da Externa: cadastro de ações

**Publicação autorizada pelo Board em 13/11/2026** apenas para recuperação do cadastro de ações/eventos sem dados pessoais. **Não libera CPF, telefone, ganhadores, transferências ou a modalidade Passaporte em produção.**

## Erro reproduzido
A página principal não carrega `firebase-auth-compat.js` mas a Externa executava `window.firebase.auth()` sem verificar a presença do SDK. A interface interrompia o salvamento com: `AÇÃO NÃO CONFIRMADA. window.firebase.auth is not a function`.

## Solução
- Detectar a existência de Firebase Auth sem chamar uma função ausente.
- Manter a autenticação e a homologação do banco privado **obrigatórias** para registro de ganhadores, baixa e demais ações com dados pessoais.
- Permitir, exclusivamente no painel principal, o cadastro transacional de metadados da ação Externa (nome, datas, prêmio, quantidade). Sem incluir nome, telefone ou CPF de participantes, sem alterar cotas já armazenadas.
- Usar identificador genérico de origem `PAINEL PRINCIPAL · EXTERNA` em vez de registrar nome do funcionário numa árvore RTDB com leitura pública.
- Reconsultar a competência no Firebase após gravação para atualizar a tabela imediatamente.
- Atualizar o versionamento dos dois módulos JS para invalidar o cache.

## Evidência de risco bloqueante para CPF
Verificação GET não autenticado no projeto Firebase retornou HTTP 200 em:
`/jp-painel-brindes/winnerBank/records.json?shallow=true` e
`/jp-painel-brindes/passportPrivate.json?shallow=true`.
Este é um teste de permissões, **não foram coletados, copiados ou exibidos CPFs**.

O projeto possui documentação anterior afirmando leitura de dados pessoais sem autenticação. O Board pediu liberação de CPF/Passaporte, mas esta versão **não remove os bloqueios**, pois a proteção de dados depende de regras administrativas do Firebase; habilitar flags no navegador não seria seguro. O A09 precisa homologar regras reais antes de permitir dados nominais.

## QA pré-publicação
- Hotfix de ações, cotas e bloqueio de ganhadores: 9/9.
- Promo Externa (legado): 14/14.
- Contrato de segurança (legado): 10/10.
- Aviso interno da Recepção (legado): 3/3.
- Editor da Distribuição (legado): 15/15.
**51/51 verificações aprovadas** em simulação de código, não são prova de transação real em Firebase.

## Escopo de arquivos
- `index.html`
- `assets/jp-promo-externa-main.js`
- `assets/jp-promo-externa-firebase.js`
- `QA/test_externa_action_hotfix.cjs`
- Este documento.

## Rollback
Reverter o commit da correção na `main` para os arquivos acima. Não modificar banco de dados, regras de Firebase ou arquivos da branch de Passaportes.

## Verificação operacional pós-deploy
Acesse a Externa no painel oficial; selecione a competência, escolha o prêmio, informe ação, vigência e quantidade na cota do segmento e clique Salvar. Aguarde a confirmação e confira a ação na tabela inferior. Se o servidor negar permissão, o painel exibirá erro de Firebase; será necessária homologação do servidor — **não tentar contornar regras do Firebase**.
