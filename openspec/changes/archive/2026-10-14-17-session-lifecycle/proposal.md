## Why

Começar uma tarefa ou retomar uma sessão antiga a partir do celular evita ter que ir ao Mac (D8, D9, A9).

## What Changes

- Daemon: `session.start { profileId, cwd }` abre nova janela tmux com o launcher do perfil no diretório escolhido.
- Daemon: `session.resume { profileId, sessionId }` abre janela com `claude --resume <id>` no `cwd` original.
- Daemon: lista de diretórios recentes por perfil (a partir dos projetos do perfil).
- App: botão "Nova sessão" (perfil + diretório recente ou digitado) e "Retomar" em sessões encerradas.

## Capabilities

### New Capabilities
- `session-lifecycle`: iniciar e retomar sessões remotamente.

### Modified Capabilities

## Impact

`features/lifecycle` no daemon; `src/features/sessions` no app.
