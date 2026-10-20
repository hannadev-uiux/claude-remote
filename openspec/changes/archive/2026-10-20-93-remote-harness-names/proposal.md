## Why

A few visible places still say "Claude Remote" after the rename to Remote Harness (issue #254): the Windows scheduled task that boots WSL at logon (shown in Task Scheduler), the label of the pairing token in the Linux Secret Service, the original PRD's title, and some internal names. The README also no longer matches the project: it lists the UI as Portuguese only, says Claude Code is the only agent, counts 20 archived changes and misses most features shipped since.

## What Changes

- **Windows logon task** is created as "Remote Harness". An existing "Claude Remote" task is recognized (`doctor`, `exists`), replaced when the task is created again and removed by `service uninstall`.
- **Secret Service label** of the pairing token: "Remote Harness pairing token" for new items (lookups use the service and account attributes, which do not change).
- Internal names: the PowerShell installer's function, the OTA publisher's temporary folder prefix, a comment in the protocol package.
- The PRD moves to `.docs/prd.md` with a note that "Claude Remote" was the working name.
- README (English and Portuguese) brought up to date with v0.15.0-ALPHA: status, agents (Claude Code and Codex CLI), features, languages, project structure, trademark note.
- Kept on purpose (persisted on computers and phones, migration tracked in #85 and #83): `~/.claude-remote` and the `CLAUDE_REMOTE_*` fallbacks, the `claude-remote` command alias, tmux session, systemd unit and Keychain/Secret Service service name, the `claude-remote://` scheme, the Android notification channel and the app identifier.

## Capabilities

### Modified Capabilities
- `platform-support`: the logon task's name and its migration.

## Impact

`apps/daemon` (logon task, secrets label, tests), `install.ps1`, `apps/mobile/scripts/publish-update.mts`, `packages/protocol`, `.docs/`, README, README.pt-BR, CLAUDE.md.
