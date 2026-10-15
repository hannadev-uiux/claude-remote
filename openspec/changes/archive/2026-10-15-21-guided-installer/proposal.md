## Why

Installing required cloning the repository and running `pnpm`, `build`, `install` and `service install` by hand, and the profiles were hardcoded (`claudin`/`drclaude`). People arriving from the public repository need a one-line install, like Claude Code's, that guides their choices and lets them name the launcher for each account.

## What Changes

- `install.sh` at the root: `curl -fsSL https://maarkn.dev/claude-remote/install.sh | bash` checks macOS/Node/git, installs `tmux`/`ripgrep` via Homebrew if missing, downloads or updates the code in `~/.claude-remote/src`, builds the daemon and opens the wizard. Running it again updates.
- `claude-remote setup`: interactive wizard with the app logo in the style of Claude Code's welcome screen. It detects the `~/.claude*` directories, asks which profiles to control, the alias (launcher name) and display name of each, confirms, writes `config.json` (merging), installs launchers/PATH/hooks, and offers the service and pairing. Unselected profiles have their launcher and hooks removed. `--yes` runs without questions.
- `claude-remote install` now reuses the same installation routine.
- App: step-by-step guide on the pairing screen for those who installed the app first (Tailscale on the iPhone and the Mac, shareable install command, pairing).
- `maarkn.dev/claude-remote/install.sh` redirects (307) to the `install.sh` on `main` on GitHub.

## Capabilities

### New Capabilities
- `guided-installer`: one-line installation and profile setup wizard.

### Modified Capabilities

## Impact

`install.sh`, app (pairing), daemon CLI (`features/setup`), new `@inquirer/prompts` dependency, README, `maarkn.dev` website (redirect).
