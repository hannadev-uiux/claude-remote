## Context

`PermissionBroker` holds the `PermissionRequest` hook open while the phone decides. Claude Code shows its own dialog in the TUI at the same time, and closes the hook request (abort) when the user answers there. The broker settles a request in three ways today: a decision from the phone, `expired` after `permissionTimeoutSec` (280 s; it answers the hook with no decision, so the TUI dialog stays), and `cancelled` when the hook request is aborted. Both `expired` and `cancelled` broadcast `permission.resolved`, and the app removes the card. When Claude Code aborts the hook for any reason other than an answer (its own hook timeout, 300 s as installed), the dialog is still open in the terminal, but the phone shows nothing.

Claude Code 2.1.304 has no upper bound for a hook's `timeout` (seconds; the HTTP hook is an axios POST with only an abort signal), so the installed timeout can cover a long wait.

## Goals / Non-Goals

**Goals:**
- A question or plan stays answerable from the phone for a long time.
- When the hook can no longer carry the answer, the phone keeps showing the request and says where to answer it.
- No automatic answers; reminders and logs carry no content.

**Non-Goals:**
- Answering a handed-over request from the phone by sending keys to the TUI menu. Claude Code's menus differ by tool and version (tabs for several questions, a review step, numbered options), and a wrong key could pick an answer the user did not choose. The card opens the raw terminal instead, which can already answer any TUI menu.
- Detecting TUI menus from the pane (screen scraping).

## Decisions

- **Two timeouts.** `questionTimeoutSec` (default 3300) for requests with `interaction`, `permissionTimeoutSec` (280) for the rest. The hook timeout written into settings is `hookTimeoutSec(config) = max(hookPermissionTimeoutSec, questionTimeoutSec + 20)`, so the daemon always answers first. Tool permissions still expire at 280 s, before the hook would.
- **Handover instead of settling.** A pure function decides what happens when the hook ends without a decision:
  - `expired` (daemon timeout): hand over right away.
  - `aborted` (Claude Code closed the hook): hand over after a grace period (`HANDOVER_GRACE_MS`, 3 s). An answer in the terminal writes a tool result to the transcript within that period, and the request resolves as `cancelled` without ever being shown as handed over.
  - `cancelled` from `cancelAll` (session ended) and shutdown (`dispose`) still settle directly.
- **When a handed-over request ends.** The broker watches the session through an injected `watch(sessionId, onMove)`. It ends the handover on the first of:
  - a transcript `tool_result` or `user` entry;
  - a `UserPromptSubmit`, `Stop` or `SessionEnd` hook of the session;
  - a new `PermissionRequest` of the session;
  - the session ending.

  It then broadcasts `permission.resolved` with the original outcome (`expired` or `cancelled`). A watch that cannot follow the transcript (no transcript path) relies on hooks only.
- **The wire.** `PermissionRequestInfo.terminal?: boolean`, sent again with `permission.request` (the app keys requests by `requestId`, so it replaces the card's data). Old apps keep showing the card and get `already_resolved` if they answer; that is better than today's disappearing card. `permission.respond` / `permission.answer` on a handed-over request get `already_resolved` with a message saying to answer in the terminal.
- **Session state while handed over.** `hasPending(sessionId)` stays true, so queued prompts and mode changes still wait. The session keeps its `waiting` state, because no `permission.resolved` is emitted yet. The live status drops its lock-screen Allow/Deny (a new `permission.handover` bus event), and the denial on session close skips handed-over requests, since there is no hook left to answer.
- **Reminder.** One push when a question or plan has waited `QUESTION_REMINDER_MS` (10 minutes), if it is still open, whether or not it was handed over. It is sent only when the request's timeout is longer than that wait. It goes through `PushService.notify`, so it follows the mute and foreground rules. It has no category, so no Allow/Deny.
- **Log.** `info` with `{ tool, end: 'expired' | 'aborted' }` on every handover, and `{ tool, outcome }` when it ends. No input or answers are logged.

## Risks / Trade-offs

- [A tool result from a parallel tool call could end a handover while the dialog is still open] → The app then drops the card, as it does today. The terminal still shows the dialog, and the session stays `waiting` until the next hook.
- [The transcript is slow to write a terminal answer] → The card flips to "Answer in the terminal" briefly, then resolves.
- [Existing installs keep the 300 s hook timeout until `update`/`install`] → Claude Code aborts the hook at 300 s, and the request is handed over instead of disappearing.
