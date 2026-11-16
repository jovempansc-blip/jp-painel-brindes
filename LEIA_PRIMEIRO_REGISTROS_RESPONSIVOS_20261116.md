# JP BOARD ROOM - Registros responsivos na Promo Externa (16/11/2026)

Board: melhoria do layout da listagem de ganhadores da acao, especialmente no celular.
Base: 040c85a4b33e5cddc863499e1e4e16d9b6f2c844.

Escopo publicado: quatro colunas com proporcoes legiveis no desktop. No celular, titular e acompanhante em area unica; premio e data abaixo em campos separados; situacao em faixa propria. Rolagem interna para longas listas. Telefone do titular permanece visivel, assim como os dados de acompanhante. O status AGUARDANDO_RETIRADA passa a ser apresentado como AGUARDANDO RETIRADA. O botao EDITAR ACOMPANHANTE permanece funcional.

CPF integral da Recepcao: permanece pendente, porque o site e o banco ainda usam acesso publico sem autenticacao no piloto. A exibição completa em ficha administrativa requer sessao de operador e auditoria. Os CPFs ja salvos no banco nao foram apagados nem modificados.

QA: 24 verificacoes de layout + 24 do cadastro/acompanhante/estoque = 48 testes aprovados. HTML, JS e CSS sem erros. Sem gravacao no Firebase real.

Rollback: restaurar exclusivamente promo_externa.html, assets/jp-promo-externa-pages.js e assets/jp-promo-externa.css do commit anterior. Preservar todos os dados reais, registros e regras Firebase.