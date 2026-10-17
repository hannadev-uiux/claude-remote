## Why

Starting a new session from the app looks broken (issue #64): tapping "Start session" seems to do nothing and the daemon log shows nothing. Reproducing the daemon side (source and the installed v0.6.0 build, with the LaunchAgent environment) shows `session.start` works when it arrives, so the failure is in what the user sees around it:

- Before launching, the app may wait for a direct `checkout.inspect` (up to the 15 s request timeout) with no spinner, so the button looks dead and repeated taps queue more requests.
- The daemon answers `ack` as soon as the launcher prints the pane, even when Claude Code exits right away (bad flag, missing binary, crash). The app goes back and no session ever appears.
- The daemon logs no `session.start` at all, accepted or rejected, so there is nothing to investigate, and the launcher failure text is hard-coded in Portuguese.

## What Changes

- App: the start decision (inspect → confirm → launch) becomes a pure, tested function. The button shows the spinner from the first tap until the start finishes or fails, ignores repeated taps, and the pre-launch inspection is capped at a few seconds (on timeout it launches without the warning, as with daemons that cannot inspect).
- App: failures show a translated message: invalid directory (not found or outside the home folder), unknown profile, Claude Code failing to open in tmux (with the daemon's reason), timeout and disconnection.
- Daemon: after the launcher returns, `session.start` checks that the pane is still alive after a short settle time; if it closed, it replies `error` `internal` with a clear reason instead of `ack`.
- Daemon: every `session.start` is logged: `info` with the profile, pane and worktree flag when it succeeds, `warn` with the error code and reason when it is rejected. The launcher failure message is in English.

## Capabilities

### New Capabilities

### Modified Capabilities
- `session-lifecycle`: new session start checks the pane, logs outcomes, and the app's start flow gives feedback and clear errors.

## Impact

`apps/daemon`: `features/lifecycle` (service + handler logging) and tests. `apps/mobile`: `NewSessionScreen`, a pure `start-plan.ts` with Vitest tests, i18n catalogs. No protocol change (errors keep existing codes, so older apps still understand them).
