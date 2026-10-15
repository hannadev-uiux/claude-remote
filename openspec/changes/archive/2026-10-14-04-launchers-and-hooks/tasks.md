## 1. Launchers

- [x] 1.1 Create the launcher zsh template and the per-profile generator; verify with a test of the generated content and `zsh -n` on the script
- [x] 1.2 Implement installing the launchers in `~/.claude-remote/bin` and the marked block in `~/.zshrc`; verify with a test in a temporary directory

## 2. Hooks

- [x] 2.1 Implement idempotent merge/removal of the HTTP hooks in `settings.json` with backup and atomic write; verify with tests for reinstall, user hooks and uninstall
- [x] 2.2 Implement the `POST /hooks/:event` route with Zod schemas for the payloads and publishing on the event bus; verify with an `inject` test for each event
- [x] 2.3 Add the `install` and `uninstall` commands to the CLI; verify by running against a temporary `CLAUDE_CONFIG_DIR`
