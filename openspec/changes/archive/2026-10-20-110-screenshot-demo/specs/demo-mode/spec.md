## ADDED Requirements

### Requirement: Demo sandbox
`pnpm --filter @remote-harness/daemon demo` SHALL run the real daemon in a throwaway environment filled with fictional data, for screenshots and demos. It SHALL use its own data home, a file token store, its own tmux server (no `TMUX`, its own `TMUX_TMPDIR`), development mode on `127.0.0.1`, ports other than the defaults, push off, and `HOME` pointing at the demo root, so it never reads or changes the user's real config, token, tmux sessions or Claude Code folders. On macOS the root SHALL default to `/Users/Shared`, so the app shows the demo paths under `~`; `--root <dir>` SHALL choose another one.

It SHALL create, and list in a manifest: profiles "Personal" (`~/.claude`), "Work" (`~/.claude-work`), an OpenRouter profile with a default model and a Codex profile; git repositories under `~/code` with branches, and worktree folders under `<repo>/.claude/worktrees/`; Claude Code sessions in tmux panes registered through the hooks, with transcripts, titles and status lines. At least one session SHALL wait on a permission request (kept pending while the demo runs), one SHALL be running, others idle, and one ended (read-only). Every name, path, prompt and output MUST be fictional.

It SHALL print a `remoteharness://pair?host=127.0.0.1&port=<port>&token=<token>` link. It MUST refuse to start when a path it would create already exists and is not in its manifest. On exit (Ctrl+C) and with `--clean` it SHALL stop the daemon and its tmux server and remove only the paths in the manifest.

#### Scenario: Start the demo
- **WHEN** the developer runs `pnpm --filter @remote-harness/daemon demo` and opens the printed link on a simulator
- **THEN** the app pairs with the demo daemon and lists the fictional sessions, one of them waiting for a permission

#### Scenario: Real data untouched
- **WHEN** the demo runs while the user's own daemon and tmux sessions are running
- **THEN** neither the app paired with the demo nor the demo's tmux server sees them, and the user's config and token are unchanged

#### Scenario: Existing folder
- **WHEN** `/Users/Shared/code` already exists and was not created by the demo
- **THEN** the demo exits with an error naming the folder and creates nothing

#### Scenario: Clean up
- **WHEN** the developer stops the demo with Ctrl+C
- **THEN** the daemon and the demo tmux server stop and every path the demo created is removed

### Requirement: Host name override
The daemon SHALL report `REMOTE_HARNESS_HOST_NAME`, when set and not empty, as the computer's name in `hello`, instead of the system host name.

#### Scenario: Demo machine
- **WHEN** the daemon runs with `REMOTE_HARNESS_HOST_NAME=studio`
- **THEN** the app names the machine "studio"
