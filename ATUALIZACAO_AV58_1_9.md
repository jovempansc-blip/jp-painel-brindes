# JP Workspace — AV58.1.9 — exclusão na Distribuição

Correção sobre a AV58.1.8, preservando as otimizações anteriores.

- Uma campanha já migrada ao modelo mensal não recria automaticamente competências removidas. A migração de registros antigos continua disponível; criação e extensão explícitas continuam com seu fluxo normal.
- A remoção do último cadastro pode resultar em uma base operacional vazia quando todas as remoções estiverem registradas agora na lixeira. A proteção contra snapshots vazios inesperados continua ativa.
- A exclusão aguarda a confirmação de gravação do Firebase. Falhas restauram o estado confirmado e exibem mensagem de erro, sem afirmar sucesso.
- Outros meses são preservados. Cadastros com programação ou promoções vinculadas no mês continuam protegidos pelo bloqueio existente.

Verificação: sete arquivos de testes locais passaram, incluindo reprodução dos dois defeitos e confirmação, falha e bloqueio da exclusão. Seis scripts HTML compilaram. Sem gravação na base de produção e sem publicação. Teste visual em navegador não realizado neste ambiente.

Aplicação: substitua index.html por esta versão. O ZIP completo inclui os demais arquivos da AV58.1.8. Preserve as imagens já existentes na pasta assets, ausentes no ZIP original. Veja também ATUALIZACAO_AV58_1_8.md.
