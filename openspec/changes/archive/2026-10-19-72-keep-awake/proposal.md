# 72 · Keep the computer awake while sessions run

## Why

When the computer idles into sleep, the daemon, tmux and the running sessions are suspended: the app loses the connection, prompts sent from the phone never arrive and no push goes out (#62). Nothing prevents it today, and the app only says "reconnecting…", so the user cannot tell a sleeping computer from a network hiccup.

## What Changes

- **Sleep inhibitor** (`infra/power.ts`): a child process that holds the OS assertion while it lives — macOS `caffeinate -i -w <daemon pid>`, Linux `systemd-inhibit --what=idle:sleep --mode=block cat`, WSL a PowerShell helper calling `SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)`. The helpers on Linux and WSL read stdin and exit at EOF, so a daemon crash never leaves the machine pinned awake. The display may still turn off and the screen still locks.
- **Setting** `keepAwake` in the daemon config: `off`, `sessions` (default: while any session is running or waiting, plus a 10-minute grace after the last activity) or `always` (while the daemon runs). Only the service daemon (not `--dev`) holds it.
- **Feature** `features/power`: pure policy (`keepAwakeDecision`) tested with Vitest; a controller that acquires and releases the inhibitor on session changes and grace timers, re-acquires if the helper dies, and releases on stop. `GET /power` and `POST /admin/keep-awake-reload` on the hooks server (secret required).
- **CLI**: `remote-harness keep-awake [off|sessions|always]` shows or sets the mode and applies it to the running daemon. `doctor` shows the mode and whether the assertion is held, fails when the OS helper is unavailable, and on a Mac laptop notes that closing the lid (without power and an external display) still sleeps.
- **App**: a connection attempt that gets no answer within 10 s is abandoned and counted as unreachable; while reconnecting after one, the banner says the computer may be asleep or offline instead of the generic "reconnecting…".
- **Docs**: the troubleshooting section on sleep explains the setting.
- Copy in pt-BR, en-US and es-ES (daemon and app catalogs).

## Out of scope

A push before the machine sleeps (Node has no portable sleep notification), changing `pmset` or lid behavior (never done silently), and waking a sleeping computer (#63).

## Impact

- Daemon: `src/infra/power.ts`, `src/features/power/{policy,index}.ts`, `src/core/config.ts`, `src/main.ts`, `src/cli.ts`, `src/core/i18n/*.ts`, tests.
- App: `src/core/connection/{daemon-client,connection-store}.ts`, `src/ui/ConnectionBanner.tsx`, `src/core/i18n/locales/*.ts`, tests.
- Web: `apps/web/content/*/troubleshooting.md`.
- Specs: `daemon-service` (ADDED Keep awake), `app-shell` (MODIFIED Automatic reconnection).
