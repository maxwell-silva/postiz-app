# Operação local Postiz

No checkout do fork, usar a branch `codex/dark-channels-integration`.
Compose: `deploy/dark-channels/compose.yaml`; project obrigatório `dark-postiz`.
Base app `35a482901583ed4219ff43afffde184e8ee373a6`; Compose canônico `dd4969e5e694cd009619a0d53cff14c21104580b` com dynamicconfig da mesma revisão. Licença AGPL-3.0 preservada. Release upstream mais recente observada: v2.25.3, commit a5affe62c74e39c1e7ac960d50d8418b807d532c; a revisão exigida é posterior, mantida explicitamente, sem seguir latest. Lock contém digests linux/amd64 reais; imagem local precisa de build bem-sucedido e ID registrado para fechar C3.

## Diagnóstico e onboarding

No checkout, usar `docker compose -p dark-postiz -f deploy/dark-channels/compose.yaml ps` e `config --quiet`. Nunca imprimir config expandido, env ou inspect completo. Logs privados em `.secrets`, fora do build context e ignorados pelo Git; só extrair diagnóstico sanitizado.

Após comprovar HTTP/UI, abrir http://localhost:4007 e cadastrar usuário local pelo formulário com senha própria. Nenhuma conta social deve ser conectada. API key e OAuth não são requisitos do onboarding local. Não há senha fixa publicada. Cadastro local ainda não realizado pelo executor.

Após cadastro, em PowerShell definir `$env:DISABLE_REGISTRATION='true'` e recriar somente Postiz com `docker compose -p dark-postiz -f deploy/dark-channels/compose.yaml up -d --no-deps postiz`; verificar bloqueio do registro. Repetir essa variável nas recriações; não deixar estado depender apenas da sessão. Antes de disponibilizar a outros usuários, persistir opção no Compose revisado. Apenas porta4007 em loopback; Temporal UI opcional via profile monitoring na8088; nenhum banco/Redis/Temporal exposto ao host.

## Atualização e rollback

1. `git fetch upstream --tags` não altera o serviço. Criar branch `codex/update-<versao>`; revisar diff, licença, migrações, lockfile e API/proxy/draft em relação à base registrada. Nenhum merge automático.
2. Fazer backup consistente: export PostgreSQL com ferramenta apropriada (pg_dump/pg_dumpall), snapshot Redis após SAVE e cópia consistente de uploads/config/Elasticsearch com o project próprio parado se necessário. Guardar backups privados, checksums, lock e IDs das imagens antes da atualização; testar restauração em volumes novos. Nunca ler/copiar acervo Dark Channels.
3. Resolver novos digests por plataforma, preservar lock anterior, construir nova imagem do fork e registrar ID/hash do diff. Validar em project separado e portas livres, com dados sintéticos ou cópia sem contas/credenciais externas. Conferir UI, auth, dependências, restart/persistência e contrato draft antes de review.
4. Somente depois de review e testes selecionar os arquivos próprios e publicar customizações autorizadas. Autocommit permanece desativado. O fechamento de 30/10/2026 autoriza explicitamente commit/push apenas dos arquivos de infraestrutura próprios auditados; não inclui código, dados ou segredos do sistema integrado.
5. Rollback: parar apenas project `dark-postiz`; usar imagem/lock anterior e restaurar snapshot de schema compatível em volumes novos, alterando referências em override revisado. Nunca fazer downgrade em banco migrado nem remover volumes originais. Conferir UI/API e dados sintéticos restaurados antes de trocar o acesso.

Proibidos `down -v`, prune global, reset/clean/stash geral, Docker socket na bridge e intervenção em serviços alheios.

## Limite da integração

Este pacote contém somente infraestrutura Postiz. O adapter mínimo do sistema integrado é mantido separadamente; não houve migração do dashboard completo. API/chave e integração live estão ausentes; escrita real permanece desabilitada. Nenhum código, dado, log, segredo ou acervo desse sistema faz parte deste pacote.

O campo `built_image.customizations` no lock registra o estado histórico no momento do build, antes do commit explícito de infraestrutura. Publicar estes arquivos não reconstrói nem altera a imagem ou os serviços.

Hashes `files` preservam os bytes CRLF do checkout usado no build validado; `files_git_lf` confere os blobs LF normalizados pelo Git. A diferença é somente de finais de linha, verificada antes da publicação.
