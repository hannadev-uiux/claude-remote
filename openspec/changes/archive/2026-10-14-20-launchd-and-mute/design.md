## Decisions

- **Plist gerado** com `ProgramArguments` = `[process.execPath, <daemon dist>/cli.js, "start"]`, `EnvironmentVariables.PATH` incluindo `/opt/homebrew/bin` (tmux, rg, git). Carga com `launchctl bootstrap gui/$UID` e `bootout` na remoção.
- **Build do daemon** com `tsup` para `dist/` (o serviço não depende de `tsx`).
- **Mute** em `~/.claude-remote/mute.json`, enviado em `auth.ok` (`muted: { profiles, sessions }`), checado pelo `PushService`.
- **tmux reiniciado**: o polling de painéis (change 05) já cobre; erro "no server running" tratado como lista vazia.
