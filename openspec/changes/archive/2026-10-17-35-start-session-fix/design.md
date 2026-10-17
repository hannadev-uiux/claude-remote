## Context

`NewSessionScreen.start()` checks the directory with `checkout.inspect` (debounced query, or a direct request when tapped before it returns), may confirm with an `Alert` when other sessions share the checkout, then sends `session.start`. `LifecycleService.start()` validates the directory, runs the profile launcher with `CLAUDE_REMOTE_NO_ATTACH=1` and replies with the pane the launcher printed. The router only logs unexpected exceptions; `DaemonError`s are replied silently.

## Decisions

- **Pure start plan.** `planStart({ worktree, checkoutKnown, peers })` returns `launch` (with or without worktree) or `confirm`. The screen resolves the inspection (cached result or a direct request raced against a 3 s timer) and feeds it to the plan. Inspection failure or timeout counts as "no peers", matching daemons without `checkout.inspect`.
- **Busy covers the whole start.** `busy` is set before the inspection and cleared when the launch settles or the user cancels the confirmation, so the spinner shows at once and the button cannot be tapped twice.
- **Pane settle check in the daemon.** After the launcher prints the pane, the service waits `settleMs` (1.5 s default, 0 in tests) and asks tmux whether the pane exists. A closed pane means Claude Code exited (the window has no `remain-on-exit`), so the start fails with `internal` and the reason "Claude Code exited right after starting". The extra delay is covered by the app's spinner. `resume` keeps its current behavior.
- **Logging in the handler.** The `session.start` handler wraps the service call: `info` on success (`profileId`, `paneId`, `worktree`), `warn` on failure (`code`, `message`), then rethrows so the router replies as before. The directory is not logged at info level (it is the user's path); the warn includes the error message, which may contain it, only locally.
- **No new error code.** Adding a code to `ErrorCodeSchema` would make older apps drop the reply (schema mismatch) and wait for the timeout. The app maps `internal` on `session.start` to a translated "could not open Claude Code" text followed by the daemon's reason.

## Risks / Trade-offs

- [1.5 s longer start] → only on success; acceptable for a background launch with a spinner.
- [A pane that dies after the settle time is still reported as started] → the session then never registers; rare and visible in the terminal/tmux.
