## Why

In the terminal, Claude Code's status line shows which model is running, the reasoning effort, how full the context window is and how close the account is to its usage limits. The app shows none of it: the user only finds out the context is full or a limit was hit when the session stops responding (#57).

## What Changes

- **Status line wrapper.** The installer registers a small `remote-harness-statusline` script as each profile's `statusLine` command. Claude Code gives it the status JSON on stdin; the script forwards it to the hooks server (127.0.0.1 + secret, in the background, never blocking) and then runs the user's original status line command with the same input, so the terminal looks exactly as before. The original command is kept inside our command (base64) and restored on uninstall. Writing `settings.json` follows the usual read → merge → backup → atomic write, idempotent.
- **Daemon.** A new `POST /statusline` route parses the JSON (model, effort, context window usage, 5-hour and 7-day limits) into a per-session `status` and per-profile account limits. Sessions carry `status` (without bumping `updatedAt`); limits are sent once per profile with a new `limits.updated` message and replayed to every client that connects.
- **App.** A compact one-line status bar under the session header: model · effort · context % · 5-hour limit · weekly limit. Items without data are hidden (never `0%`); colors go from secondary text to Claude orange (≥ 70%) to red (≥ 90%). Tapping it opens a sheet with the details (tokens, reset times).
- Texts in pt-BR, en-US and es-ES.

## Capabilities

### New Capabilities
- `status-line`: status line wrapper, `/statusline` reception, session status and account limits on the wire.

### Modified Capabilities
- `app-conversation`: new "Status bar" requirement.

## Impact

- `packages/protocol`: `SessionStatusSchema`, `Session.status`, `AccountLimitsSchema`, `limits.updated`.
- `apps/daemon`: `features/status-line/` (payload parser, settings wrapper, script renderer, feature), `installAll` / `uninstall` wiring, i18n line for the installer.
- `apps/mobile`: `features/session-status/` (pure logic with tests, limits store, `StatusBar`, `StatusSheet`), session route, catalogs.
- No native change: the app part ships over the air; the daemon needs `remote-harness update` (which re-runs the installer).
