# JP BOARD ROOM — Acompanhante na Promo Externa (16/11/2026)

Escopo autorizado pelo Board: incluir dados do acompanhante no cadastro da Promo Externa, mantendo a mesma lógica de distribuição e a Recepção sincronizada.

## Correção funcional
- Campos de acompanhante (nome, telefone opcional, CPF opcional) aparecem somente em ações com entrega de PAR. Quando os dados ainda não estiverem definidos, os três campos podem ficar vazios.
- O nome informado exige pelo menos nome e sobrenome; telefone opcional é verificado se preenchido; CPF opcional também é validado se preenchido.
- Um único ganhador continua consumindo somente um PAR da ação (dois ingressos físicos). O acompanhante fica vinculado ao mesmo registro `winnerBank/records/EXTERNA_<winnerId>`, sem gerar outro ganhador nem desconto extra.
- Os dados do acompanhante são mostrados no painel Promo Externa, Recepção Externa e ponte da Recepção principal. Nome e contato aparecem; CPF é apenas sinalizado como cadastrado na listagem, sem exibição do número.
- O cadastro de acompanhantes pode ser completado, alterado ou apagado posteriormente pelo botão EDITAR ACOMPANHANTE na própria lista da Promo Externa. A alteração é gravada por transação, incrementa a revisão e mantém histórico de mudanças no mesmo registro do banco.
- Não é permitida uma identificação de acompanhante igual ao nome do titular.
- Ganhos individuais continuam sem campo de acompanhante.
- Não foram modificados saldos, reservas, regras, autenticação, configurações ou dados diretamente no Firebase.
- Esta versão permanece em piloto com as regras públicas anteriores, portanto só devem ser cadastrados dados fictícios enquanto não houver migração e proteção do servidor.

## QA
24 testes de cadastro e persistência (incluindo oito cenários de acompanhante), 10 testes da ponte com Recepção e 16 testes legados Promo Externa passaram: 50/50 verificações.
O JavaScript dos quatro módulos e os scripts inline de três páginas passaram na validação de sintaxe. IDs HTML sem duplicações.
Não foram feitas gravações no Firebase real. A homologação operacional com a Recepção e o Firebase reais ainda precisa ser realizada pelo operador do piloto.

## Rollback
Restaurar os oito arquivos de aplicação alterados ao commit anterior, sem modificar nem apagar dados do Firebase. Os campos `companion` e `companionAudit` são aditivos; registros gravados após a publicação não devem ser removidos durante um rollback.
