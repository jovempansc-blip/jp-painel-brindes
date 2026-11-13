# A09 — Plano de homologação de regras Firebase RTDB

**Proposta exclusivamente documental; NÃO executar alterações reais sem decisão do Board.**

## Árvore planejada

`jp-painel-brindes/state/receptionCampaignPins` — metadados da Recepção (sem CPF).

`jp-painel-brindes/state/passportCampaigns` — vínculos de promoção/evento e reservas físicas (sem CPF).

`jp-painel-brindes/state/passportAudit` — auditoria de vínculos, sem CPF.

`jp-painel-brindes/passportPrivate/<promo_id_hex>/{tickets,audit}` — CPF nominal e auditoria dos beneficiários, contendo apenas informações necessárias ao controle.

Não modificar `winnerBank`, `months/*/promos`, resultados oficiais, configurações de Estúdio ou de Promo Externa sem outra autorização expressa.

## Protocolo de aprovação de regras

1. Obter snapshot/versionamento das regras **atuais** pelo Console ou API administrativa autenticada; guardar rollback somente em repositório/arquivo privado e controlado.
2. Inspecionar todas as concessões ancestrais `.read` e `.write`: `/`, `/jp-painel-brindes` e `/jp-painel-brindes/passportPrivate`. Regras mais específicas que negam acesso **não revogam** concessões feitas em um ancestral no Realtime Database.
3. Especificar autenticação Firebase no dispositivo de Recepção. Claim `jpReception === true` ou `jpAdmin === true` precisa ser emitida por backend administrador — nunca por JavaScript do navegador. Registrar o UID da operação.
4. No emulador, testar matriz abaixo com dados sintéticos. Concessão mínima: usuários autorizados leem/alteram apenas fichas nominais correspondentes; cliente comum nunca lê os CPFs.
5. Restringir escrita/remoção das auditorias e preservar histórico. Não permitir reduzir revisões nem excluir `status=UTILIZADO` sem fluxo administrativo de correção.
6. Planejar prazo de retenção/anonimização de CPF e critérios legais aplicáveis; documentar que histórico de sorteios sem necessidade de CPF pode permanecer acessível.
7. Validar a nova regra no Firebase de homologação e executar testes de dois computadores, conflitos, desconexão, reload, transferência, baixa e exclusão/restore. Não utilizar cadastros reais neste ciclo.
8. Somente depois liberar as flags de funcionalidade no pacote autorizado, com relatório A09 e plano de rollback.

## Matriz de acesso para homologação

| Identidade | Lê resultados oficiais | Lê CPF de Passaporte | Escreve beneficiários e baixas | Altera regras |
|---|---|---|---|---|
| Anônimo | Conforme política atual | **Negado** | **Negado** | **Negado** |
| Estúdio sem claim de Recepção | Conforme política atual | **Negado** | **Negado** | **Negado** |
| Operador da Recepção com claim | Conforme o perfil | Permitido, com escopo definido | Permitido, auditado | **Negado** |
| Administrador autorizado | Conforme perfil | Permitido | Permitido para correções auditadas | Somente com autorização do Board |
| Credencial desativada/expirada | Conforme autenticação | **Negado** | **Negado** | **Negado** |

## Critérios de reprovação imediata

- Qualquer usuário sem claim lê um CPF real via REST, SDK ou exportação da raiz.
- A palavra `disabled` no campo é o único mecanismo de proteção.
- É possível apagar auditoria ou reverter `UTILIZADO` sem trilha de alteração.
- Um evento já comprometido perde reserva por edição de outro painel ou outra competência.
- Duas estações registram baixa diferente no mesmo ingresso e ambas recebem confirmação.
- Falha de gravação de auditoria deixa beneficiário/baixa confirmados sem registro correspondente.
- A interface ativa flags sem comprovar a versão das regras em produção.

**Parecer A09 hoje: NÃO HOMOLOGADO.** A solução de cliente está preparada para a validação, mas as regras privadas reais não foram inspecionadas nem alteradas.
