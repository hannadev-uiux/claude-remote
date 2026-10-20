## MODIFIED Requirements

### Requirement: Codex hooks installation
For Codex profiles, `install` and `setup` SHALL merge command hooks for `SessionStart`, `UserPromptSubmit`, `PermissionRequest`, `Stop` and `SessionEnd` into `<CODEX_HOME>/hooks.json`, posting the event to the daemon with the hook secret, the tmux pane and the profile; read → merge → backup → atomic write, idempotent, never touching the user's own hooks, and removed by `uninstall` or when the profile leaves the config. Setup and doctor MUST tell the user that Codex asks to trust new hooks once ("Hooks need review" → trust), and doctor SHALL report whether the hooks are installed and whether `codex` is on the PATH. The PATH check SHALL also run when no Codex profile is configured yet but a `~/.codex` (or `~/.codex-*`) directory holding `config.toml`, `auth.json` or `sessions` is found; in that case doctor SHALL additionally report that a Codex account was found without a profile and point at `remote-harness setup`. With neither a Codex profile nor such a directory, the Codex checks are skipped, as before.

#### Scenario: Idempotent install
- **WHEN** `remote-harness install` runs twice for a Codex profile whose `hooks.json` has a user hook
- **THEN** the file has the user hook and one Remote Harness group per event, and the second run changes nothing

#### Scenario: PATH checked without a configured profile
- **WHEN** `doctor` runs on a machine with no Codex profile, a `~/.codex` directory with `config.toml`, and `codex` not on the PATH
- **THEN** it still reports the `codex` PATH check as failed, instead of skipping it

#### Scenario: No Codex signal at all
- **WHEN** `doctor` runs on a machine with no Codex profile and no `~/.codex`-like directory
- **THEN** the Codex PATH and hooks checks are skipped, as before

#### Scenario: Account found without a profile
- **WHEN** `doctor` runs on a machine with `~/.codex/config.toml` and no profile uses it
- **THEN** it reports a Codex account was found without a profile and points at `remote-harness setup`
