## 1. Service

- [x] 1.1 Set up the daemon `tsup` build and the `claude-remote` binary; verify with `pnpm --filter daemon build` and `node dist/cli.js --help`
- [x] 1.2 Implement `service install|uninstall|status` with plist generation; verify with a test of the generated plist and `plutil -lint`
- [x] 1.3 Treat tmux "no server running" as an empty list; verify with a `TmuxClient` test

## 2. Mute

- [x] 2.1 Implement `MuteStore` in the daemon and the check in `PushService`; verify with tests
- [x] 2.2 Create per-profile toggles in settings and a bell button in the session; verify with typecheck and `expo export`
