# JP BOARD ROOM - Correção de dupla reserva nos Passaportes (15/11/2026)
Base oficial: d8cb2681c08e6e9bf77c1ee4816219a4b709584f.
Board: autorizou publicar correcoes pendentes.

ESCOPO
Promocao Unica exige premio e segmento-base da Distribuicao Geral.
Passaporte e cadastrado sem segundo premio/segmento-base. Seus ingressos sao comprometidos somente pelos eventos vinculados em SHOWS, com competencia, segmento e reserva especificos.
Os campos de premio e segmento-base ficam ocultos e deixam de ser obrigatorios em Passaporte.
Campanhas legadas com shows vinculados nao recebem compromisso de estoque duplicado. Os IDs historicos de premio e segmento sao preservados como metadados.
Nenhum cadastro, resultado, auditoria ou reserva do Firebase foi modificado nesta publicacao.

QA A09
22 testes da nova correcao; 36 core; 15 editor compatibilidade; 12 multimês; 7 commit Firebase simulado: 92/92 passaram.
Scripts JS inline, IDs HTML e CSS sem erros.

NAO INCLUI
Desbloqueio nominal (regras Firebase ainda abertas publicamente).
Recirculacao automatica por vencimento (pendente protecao transacional e homologacao multioperador).

ROLLBACK
Restaurar index.html e assets/jp-promo-passport-links.css do commit anterior.
Preservar todos os registros reais, ganhadores, reservas, resultados, auditores e retiradas.