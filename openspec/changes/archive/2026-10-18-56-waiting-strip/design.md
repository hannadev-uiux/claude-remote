## Context

Pending requests live in `usePermissionsStore.pending` (replayed by the daemon on every connect) and are answered through `useRespond()` (`permission.respond` / `permission.answer`), with `AlwaysAllowSheet` for rules; `SessionPermissions` renders them inside the session. The list already receives per-session pending counts for the row badge. Sessions can also be `waiting` without a request in the store (a `Notification` hook without a `PermissionRequest`, e.g. an idle prompt), in which case there is nothing to answer inline. The prototype (`screens/sessions-list.html`, `.attn`) fixes the strip layout.

## Goals / Non-Goals

**Goals:** answer the oldest tool permission from the list with exactly the session screen's semantics; surface questions, plans and waiting sessions with a way in; keep the list order untouched; pure, tested selection logic reusable by the tray and the lock screen.

**Non-Goals:** answering questions or approving plans inline (they need the full card); a scrolling list of all pending items; changing the row badge; the daemon.

## Decisions

- **Selector.** `pendingForStrip(sessions, requests)` builds items from every pending request (`kind: 'request'`, `since = createdAt`) plus every `waiting` session without a request (`kind: 'waiting'`, `since = updatedAt`), sorts by `since` ascending and returns `{ sessions, oldest, next, more }` or `null`. `sessions` counts distinct session ids (several requests in one session count once); `more = items.length - 1`; `next` is the second item (the target of `+N more`).
- **Answers.** `WaitingStrip` reuses `useRespond()`; Deny/Allow call `respond(requestId, …)`, Always opens `AlwaysAllowSheet` with the session's `cwd` and profile name (looked up from the sessions and connection stores). Errors show under the buttons as in the session screen; `already_resolved` drops the item and the next one takes its place.
- **Non-answerable items.** Interaction requests (`question`, `plan`) and `waiting` sessions render a one-line status ("has a question", "plan ready for review", "waiting for you") and an **Open** button that navigates to the session, where the full card is.
- **Elapsed time.** `useNow(1000)` re-renders the strip once a second; `formatElapsed(ms)` gives `m:ss` or `h:mm:ss`. Mounted only while the strip shows, so the list does not tick otherwise.
- **Placement.** Above the `FlashList` (not a list header), so it stays pinned while the list scrolls, between the search box and the list.
- **Styling.** Surface card with the warning border, uppercase warning header with letter spacing, the agent badge, the profile tag and the `Tool · argument` line (`describePermission` detail), per the prototype.

## Risks / Trade-offs

- The strip takes vertical space on small phones while something is pending; it is the point of the feature, and it disappears as soon as nothing waits.
- A session `waiting` without a request (notification-only) cannot be answered from the strip; Open is the honest affordance.
