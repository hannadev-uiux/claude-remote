## Context

Users already run the daemon from `~/.claude-remote/src`, with launchers, hooks, a background service and a Keychain token that reference the old name. The app is installed with bundle ID `tech.doctorx.clauderemote` and receives OTA updates by fingerprint.

## Decisions

- **Rename names, not persisted identifiers.** Anything a running install depends on (bundle ID, Keychain service, launchd label, systemd unit, tmux session, hook headers, pane env vars, pairing URL scheme) stays as is; each needs a migration and gets its own issue.
- **Single resolver for environment variables.** `env('HOME')` reads `REMOTE_HARNESS_HOME`, then `CLAUDE_REMOTE_HOME`. Shell scripts use `${REMOTE_HARNESS_X:-${CLAUDE_REMOTE_X:-default}}`.
- **Data directory without moving data.** Resolution order: env override, `~/.remote-harness` if it exists, `~/.claude-remote` if it exists, else `~/.remote-harness`. Moving the directory under a running service (with the source checkout, the Node runtime and the app bundle inside) is risky and gains nothing now.
- **CLI alias.** `package.json` `bin` declares both names and `install` writes both shortcuts, so muscle memory, scripts and the old `update` path keep working.

## Risks

- A stale `claude-remote update` from an old version runs the new `install.sh --update` from the existing source dir: it keeps working because the source dir, env fallback and alias are preserved.
