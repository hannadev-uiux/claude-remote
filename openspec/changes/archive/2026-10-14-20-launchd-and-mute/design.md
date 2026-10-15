## Decisions

- **Generated plist** with `ProgramArguments` = `[process.execPath, <daemon dist>/cli.js, "start"]`, `EnvironmentVariables.PATH` including `/opt/homebrew/bin` (tmux, rg, git). Loaded with `launchctl bootstrap gui/$UID` and `bootout` on removal.
- **Daemon build** with `tsup` into `dist/` (the service does not depend on `tsx`).
- **Mute** in `~/.claude-remote/mute.json`, sent in `auth.ok` (`muted: { profiles, sessions }`), checked by `PushService`.
- **tmux restarted**: pane polling (change 05) already covers it; the "no server running" error is treated as an empty list.
