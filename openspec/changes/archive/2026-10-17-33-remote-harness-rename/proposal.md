## Why

The project will connect other coding agents besides Claude Code (Codex, Kimi, Qwen, models through OpenRouter), so "Claude Remote" no longer describes it. It becomes **Remote Harness** (issue #81). Existing installs must keep working after `update` without any manual step.

## What Changes

- GitHub repository renamed to `remote-harness`; the installer clones the new URL (GitHub redirects the old one).
- Product name "Remote Harness" in every user-facing text: app (name, UI strings, iOS permission texts), daemon CLI, installer scripts, push, docs.
- Workspace packages `remote-harness`, `@remote-harness/protocol`, `@remote-harness/daemon`, `@remote-harness/mobile`.
- CLI command `remote-harness`; `claude-remote` stays as an alias (package bin and the shortcut in the bin directory).
- Environment variables `REMOTE_HARNESS_*` (home, source, ref, repo, language, Node dir, token store, log level, update source, OTA url/token/key); the old `CLAUDE_REMOTE_*` names are still read as a fallback.
- Data directory `~/.remote-harness` for new installs; when only `~/.claude-remote` exists it keeps being used, untouched.

Not in this change (follow-up issues): app identity (bundle ID, slug, URL scheme, EAS, Firebase, icons), identifiers persisted on the computer (Keychain service, launchd label and app bundle, systemd unit, WSL task, tmux session, hook headers and pane variables, PATH block markers), the install and OTA URLs on the web server, and agent-neutral product copy.

## Capabilities

### New Capabilities
- `product-identity`: product name, CLI command and alias, environment variables and data directory with legacy fallback.

### Modified Capabilities

## Impact

All packages (names and imports), `install.sh`/`install.ps1`, Makefile, CI workflows, i18n catalogs (daemon and app), `app.config.ts` (name and texts only), docs and living specs. No protocol or behavior change.
