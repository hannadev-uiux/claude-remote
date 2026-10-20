## Why

A question (`AskUserQuestion`), a plan approval (`ExitPlanMode`) or a permission prompt left unanswered in the app for a few minutes disappears from the phone, while the session keeps waiting in the terminal (issue #263). The daemon gives the `PermissionRequest` hook up after 280 seconds, settles the request as `expired` and the app drops the card; when Claude Code itself closes the hook (its own timeout, a dropped connection) the request is settled as `cancelled`, which the app reads as "answered in the terminal". In both cases Claude Code keeps its own dialog open in the TUI, so the agent still waits, but nothing on the phone says so.

## What Changes

- Questions and plan approvals wait much longer for the phone: a separate `questionTimeoutSec` (default 3300 s, 55 minutes). Tool permissions keep `permissionTimeoutSec` (280 s). The hook timeout written into the agent's settings covers the longer wait.
- When the hook stops waiting without an answer (the daemon's timeout, or Claude Code closing the hook while its dialog is still open), the request is not dropped: the daemon hands it over to the terminal. It sends the request again marked `terminal: true` and keeps it until the session moves on: a new transcript entry that answers or interrupts the turn (a tool result or a user message), a new turn or the end of the turn, a new request in the session, or the session ending. Only then do clients receive `permission.resolved`.
- A hook closed by an answer in the terminal moves the transcript right away, so the request resolves within a short grace period and is never shown as handed over.
- In the app, a handed-over request keeps its card, with the same title and summary, labelled "Answer in the terminal". The card has a button that opens the session's terminal, or says to answer on the computer when the session is read-only. The waiting strip shows the same status without Allow/Deny.
- A question or plan still unanswered after 10 minutes sends one reminder push ("Still waiting for your answer" / "Plan still waiting for review"), without content, and following the same mute and foreground rules as other pushes.
- The daemon logs each handover with the tool name and how the hook ended, without content.
- Nothing is ever answered on the user's behalf.

## Capabilities

### New Capabilities

### Modified Capabilities
- `permission-approval`: question timeout, handover to the terminal instead of expiring or cancelling, reminder
- `app-permissions`: card and strip state for requests handed over to the terminal
- `hooks-integration`: the `PermissionRequest` hook timeout covers the question wait
- `push-notifications`: reminder push for questions and plans
- `protocol`: optional `terminal` flag in `PermissionRequestInfo`

## Impact

- `packages/protocol`: `PermissionRequestInfoSchema.terminal`
- `apps/daemon`: `core/config.ts` (`questionTimeoutSec`, `hookTimeoutSec`), `features/permissions/handover.ts` (pure rules), broker handover and reminder, `features/permissions/index.ts` (transcript and hook watching), push reminder, live status without lock-screen actions after a handover, `setup/install.ts`; daemon i18n
- `apps/mobile/src/features/permissions`: handover card, store keeps haptics to new requests, strip; app i18n
- Existing installs get the longer hook timeout on the next `remote-harness update` or `install`. Until then, Claude Code may close the hook after 300 s, and the request is handed over to the terminal instead of disappearing.
