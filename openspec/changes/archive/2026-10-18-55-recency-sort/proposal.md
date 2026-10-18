## Why

The session list orders by state first (waiting, running, idle, ended) and only then by `updatedAt`, so the session the user was just working on can sit below older ones and the order jumps whenever a state changes. `updatedAt` is also not a real "last activity": the daemon sets it to the restart time for every restored session, and nothing bumps it while a turn streams output without hooks (#104).

## What Changes

- **Daemon: `updatedAt` means last real activity.** Hooks already bump it; transcript activity (new entries read for any subscriber or daemon-side follower, main stream or subagent) now touches it too, at most once every 5 s per session, so the list never re-sorts on every streamed token. Metadata refreshes (status line, checkout) keep not touching it. On restore, each session keeps the `updatedAt` persisted with its pane link (new field, optional for older state files), falling back to the transcript's modification time and only then to "now". A patch that only carries a newer `updatedAt` is a change (today it is dropped as a no-op).
- **App: sort option** as a ghost chip at the end of the filter row: **Recent** (default: newest activity first, regardless of state) or **By state** (today's order). Tapping toggles; the choice is saved on the device. Waiting sessions keep their warning border wherever they are (the pinned strip is #154).
- **Relative time** on every row and in the recent-directories list becomes compact: `now`, `2 min`, `40 min`, `2 h`, `yesterday`, `3 d`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `session-registry`: new "Last activity" requirement; "Link persistence" keeps `updatedAt` across restarts.
- `app-session-list`: "Flat list with filter chips" gains the sort options and the default recency order; new "Relative time" requirement.

## Impact

- `apps/daemon`: `features/sessions/store.ts` (touch semantics, persisted `updatedAt`), `features/sessions/service.ts` (`noteActivity` with throttle, restore), `features/transcript/service.ts` + `index.ts` (`onActivity` callback), `main.ts` wiring; tests.
- `apps/mobile`: `features/sessions/sort-store.ts` (new), `filter.ts` (`listSessions` with sort), `SessionsScreen` (sort chip), root layout (restore), `core/utils/time.ts`, the three catalogs (`time.*`, `sessions.sort.*`); tests.
- No protocol change.
