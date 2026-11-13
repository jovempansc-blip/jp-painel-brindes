# JP Workspace — Hotfix de identidade suave + vínculo de eventos em Promoções
Data: 2026-11-13. Base GitHub main: c281868247a43817628bbc837162a0bcbeb57508.

## Escopo expressamente solicitado pelo Board
- Tornar Promo Externa suave, sem cores saturadas nos cartões, ações e indicadores, preservando logo oficial.
- Cabeçalho: logo esquerda, título PROMO EXTERNA centralizado e ponto circular direita indicando **conexão real** com o Firebase: verde conectado, âmbar conectando, vermelho discreto offline. O ponto permanece clicável para autenticar com Google, pois remover login interromperia a operação existente.
- Remover rodapé com textos técnicos e login. Mensagens de sucesso/erro ficam junto ao formulário central, sem perder visibilidade.
- Proporções operacionais: promoções 24%, ação/cadastro 45%, registros 31%, com responsividade.
- Criar botão SHOWS na linha de promoção e VINCULAR / EDITAR EVENTOS dentro da ficha em Prêmio e Sorteio, visível depois de salvar a promoção.
- Modal no layout padrão para adicionar/remover eventos já cadastrados na Distribuição Geral, de qualquer competência, informando segmento, reserva específica, unidades físicas e ingressos por ganhador.
- Vincular é **compromisso de uma parte da cota já reservada**; não produz nova subtração física e não registra CPF/nomes.
- Proteger edição e exclusão da distribuição contra perda das unidades comprometidas. Validar no servidor antes de salvar.
- Preservar hotfix da aba Externa na main e permissões originais do Firebase.

## Acesso
Painel principal, aba PROMO/MERCHAN: editar promoção salva → Prêmio e Sorteio → VINCULAR / EDITAR EVENTOS.
Alternativa rápida: botão SHOWS na tabela de promoções.

## Persistência prevista
O modelo usa `state/passportCampaigns/<id_codificado>` e `state/passportAudit` dentro do mesmo banco RTDB da Distribuição Geral.
Registros de nome/CPF **não são tocados**. Este pacote não altera `winnerBank`, `passportPrivate`, regras de Firebase, Studio ou a Recepção.

## Restrições e homologação
- O campo CPF da Promo Externa fica visível como OPCIONAL porém desabilitado, até que as regras privadas do Firebase estejam auditadas. Não se pode coletar CPF via interface e ignorá-lo no armazenamento sem transparência.
- O cadastro nominal continua bloqueado pelo contrato atual de segurança; esta atualização não autoriza registros pessoais em base com leitura não autenticada.
- A verificação de compromissos na edição da Distribuição é remota, mas ocorre antes do salvamento, não em transação única com todas as rotas legadas. Corridas raras entre editar distribuição e cadastrar vínculo exigem homologação operacional.
- Este pacote não ativa Fixadas e Histórico da Recepção ainda presentes na branch de desenvolvimento, nem declara que essas telas estão funcionando na main.
- O teste operacional com Firebase autenticado e navegadores reais continua pendente. Não inserir dados falsos na produção.

## QA local
Novos: 20/20; regras de Passaporte: 36/36; guard da Distribuição: 6/6; Externa legada 14/14; contrato de segurança 10/10; hotfix Externa 9/9; Recepção 3/3; Distribuição compatível com o guard 15/15; distribuição multimês 12/12; commit Firebase simulado 7/7.
**132 verificações direcionadas passaram, com guard corretamente simulado nos testes legados.**
Soma: 20+36+6+14+10+9+3+15+12+7=132.

## Rollback
Reverter exclusivamente os quatro arquivos oficiais modificados:
index.html, promo_externa.html, assets/jp-promo-externa.css, assets/jp-promo-externa-pages.js.
Remover novas inclusões em assets e QA se estiverem referenciadas por versão posterior. Preservar registros de passaporte que possam ter sido criados pelo operador; não apagá-los automaticamente.
