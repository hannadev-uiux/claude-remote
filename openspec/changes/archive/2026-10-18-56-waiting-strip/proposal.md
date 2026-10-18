## Why

With the list ordered by recency (#104), a session waiting for a permission can sit anywhere in the list and the user has to open it to answer. The redesign (#154) pins a "Waiting for you" strip above the list that shows the oldest pending request with the same Deny / Always / Allow buttons as the session screen, so the most common interruption is answered from the list, without breaking the order of the rest.

## What Changes

- **Strip above the list** whenever at least one session is waiting: header `⚠ WAITING FOR YOU · N` (N = sessions waiting) with a live elapsed time since the oldest item; then the oldest pending item: agent badge, session title, profile tag, and `Tool · argument` (command, path, URL or input).
- **Inline answers** for tool permissions through the existing flow (`useRespond`, `permission.respond`); **Always** opens the existing rule sheet with the session's folder and profile. Question and plan prompts (interaction requests) and sessions that are `waiting` without a request in the store show "has a question" / "plan ready for review" / "waiting for you" with an **Open** button instead.
- **`+N more`** when more than one item is pending, opening the session of the next item.
- The list order is untouched; the waiting row keeps its warning border and its pending badge.
- Pure selector `pendingForStrip(sessions, requests)` (oldest first, counts, next item) and `formatElapsed` with tests; texts in pt-BR, en-US and es-ES.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-session-list`: new "Waiting strip" requirement.
- `app-permissions`: new "Answers from the list" requirement (same flow and rule sheet as the session screen).

## Impact

- `apps/mobile`: `features/permissions/strip.ts` (+ test), `features/permissions/components/WaitingStrip.tsx`, `core/utils/use-now.ts`, `features/sessions/SessionsScreen.tsx`, the three catalogs (`permissions.strip.*`).
- No protocol or daemon change. The tray (#160) and the lock screen (#158) reuse the same card later.
