# JP BOARD ROOM — Hotfix Promo Externa sem identificação obrigatória de locutor

Data: 16/11/2026. Board autorizou remover o erro "INFORME A IDENTIFICAÇÃO DO LOCUTOR." que impedia salvar ganhadores no link Promo Externa.

## Causa
A página `promo_externa.html` tinha `jpExtOperator` como campo oculto e vazio. A rotina `handleRegistration` exigia nome do locutor, impedindo o envio do ganhador ao Firebase.

## Correção publicada
1. Remover o campo oculto desnecessário da Promo Externa.
2. Remover a validação obrigatória de nome do locutor apenas no fluxo de cadastro externo.
3. Registrar a operação com origem estável `PROMO EXTERNA · ESTÚDIO` quando não existir nome de operador.
4. Preservar o cadastro de ganhador (nome completo, telefone com DDD, CPF opcional), validação de saldo, armazenamento transacional, conciliação com Banco de Ganhadores e Retirada.
5. Preservar a validação de responsável na página separada Recepção Externa.
6. Invalidar cache do controlador para carregar a nova versão no link.

## Testes
16 testes específicos de cadastro sem operador, confirmação de envio, CPF opcional, erro de saldo, integridade do fluxo da Recepção Externa; 16 testes preexistentes de Promo Externa, incluindo transações em memória e concorrência. Total: 32/32 aprovados. Parser HTML e sintaxe JavaScript aprovados; IDs DOM sem duplicações.

## Limites
Nenhuma modificação em Firebase Rules, dados existentes, saldo físico ou banco real foi executada. A publicação do GitHub Pages será validada por comparação de bytes. Teste de gravação na instância Firebase real continua sendo uma validação operacional a realizar no piloto.

## Rollback
Restaurar apenas `promo_externa.html` e `assets/jp-promo-externa-pages.js` à revisão anterior. Não excluir dados ou auditoria.
