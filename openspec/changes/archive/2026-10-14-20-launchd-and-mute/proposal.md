## Why

O daemon precisa estar sempre de pé sem intervenção manual, e o usuário quer silenciar notificações de um perfil ou sessão barulhentos (D11, A10).

## What Changes

- `claude-remote service install|uninstall|status` gera e carrega um LaunchAgent (`~/Library/LaunchAgents/tech.doctorx.claude-remote.plist`) com `KeepAlive` e logs em `~/.claude-remote/logs`.
- Recuperação após reinício do tmux: o daemon reconcilia o registro ao detectar que o servidor tmux voltou.
- `settings.mute { target: profile|session, id, muted }` e lista de silenciados persistida no daemon; o app mostra os controles nas configurações e na sessão.

## Capabilities

### New Capabilities
- `daemon-service`: execução do daemon como serviço do macOS.
- `notification-mute`: silenciar notificações por perfil ou sessão.

### Modified Capabilities

## Impact

CLI do daemon, `features/push`, telas de configurações e sessão no app.
