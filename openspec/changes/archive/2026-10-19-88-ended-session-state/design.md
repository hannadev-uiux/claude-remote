## Context

- `SessionService.handleHook` derives a state from the hook (`stateFor`) and always applies it. Any hook that carries a tmux pane also sets `paneId` and `controllable: true`.
- Claude Code fires hooks from subprocesses that post to the daemon. A `Notification` (for example the idle prompt) or a `Stop` can be delivered after `SessionEnd`. The tmux pane outlives Claude Code (it falls back to the shell), so a late hook still names a live pane.
- `sessions/index.ts` sets `running` on every `permission.resolved` that was allowed or denied. Closing a session denies its pending requests first.
- `LifecycleService.resume` drops a closed pane with `{ paneId: null, controllable: false }` and keeps the old state.
- Push (`messageForHook`) and live status react to hooks without looking at the registry.

## Goals / Non-Goals

**Goals:** an ended session never looks like it needs the user; its requests, live status and pushes end with it; the rule is testable.

**Non-Goals:** sessions running outside tmux (read-only but alive) keep their live states; this change only guards sessions that ended.

## Decisions

- **Pure rules** in `features/sessions/state.ts`:
  - `hookState(event, notificationType)`: the old `stateFor` mapping, moved here.
  - `revives(event, hasPane)`: `SessionStart`, or `UserPromptSubmit` from a pane. `SessionStart` covers `--resume` and `/clear`, which keep or replace the id. A prompt typed in a pane proves the session is alive, which brings back a live session the registry had wrongly ended (for example one only known from its transcript after a daemon restart).
  - `acceptsHook(current, event, hasPane)`: false when `current?.state === 'ended'` and the hook does not revive it.
  - `stateAfterPermission(current)`: `running` unless the session is missing or ended.

  `handleHook` keeps metadata from a rejected hook (cwd, transcript path, mode) but drops its `state`, `paneId` and `controllable`.
- **Resume path** writes `{ paneId: null, controllable: false, state: 'ended' }`.
- **Ended transition → cleanup.** `main.ts` follows `store.onChange`. On a change from a non-ended state to `ended`, it calls `broker.cancelAll(sessionId)`: pending requests settle as `cancelled`, which resolves them in the app, and the hook gets an empty answer if its process is still listening. Live status follows the store as well and ends the session's activity on that transition. Both are idempotent with the existing `SessionEnd` paths.
- **Late hooks in push and live status.**
  - Push: `isEnded(sessionId)` is injected into the push feature, like `isMuted`. For an ended session it skips `Notification` and `Stop`.
  - Live status: skips every hook but `SessionStart`/`SessionEnd` for a session the store has as ended.

  The sessions feature registers its `hook` listener first and applies a reviving hook synchronously, so these checks see the new state.
- **`(no content)`**: Claude Code writes this placeholder when a local command (such as `/exit`) has no output, and as the text of an empty assistant reply. The parser drops a command output or an assistant text that is exactly `(no content)`, after trimming.
- **App strip**: `pendingForStrip` keeps `waiting` sessions only when they are controllable, and keeps requests only when their session is not `ended`. A request with no known session is still shown, as today.

## Risks / Trade-offs

- A session the registry wrongly has as ended (rare: a daemon restart that lost the pane link while Claude Code kept running) no longer shows its waiting state until the next prompt or start. Its permission requests still reach the app through the broker, which does not depend on the session state.
- A text reply that is literally "(no content)" would be hidden. That is unlikely, and it is the exact placeholder Claude Code uses.
