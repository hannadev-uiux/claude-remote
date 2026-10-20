## Context

`SessionsScreen` is shared between the compact route (`app/(main)/index.tsx`, the full screen on phones) and the regular-width sidebar (`app/(main)/_layout.tsx`, the master pane on iPad/wide Split View). `SessionListActions` (the header's icon row) is rendered independently by each call site: the compact header via `headerActions(...)`, the sidebar header inline next to `ListTitle`. See proposal.md for why only the compact path changes.

## Goals / Non-Goals

**Goals:**
- Compact width drops the header's new-session icon for a bottom-right FAB; regular width is untouched.
- The FAB and the header icon it replaces open the exact same route (`/new`), so no behavioral drift between layouts.

**Non-Goals:**
- Hiding the FAB on scroll direction, an extended "+ New session" text variant on an empty list, and a long-press quick menu of recent projects are all explicitly optional in the source issue. None are implemented here: each adds real state/animation surface for a convenience the plain FAB already covers (the empty state's own call-to-action already names the shell command to start a session). Revisit only if specifically requested.

## Decisions

- **A `fab` prop on `SessionsScreen`, not a second component.** `SessionsScreen` already renders the `Screen`/`FlashList` shell both layouts share; a prop keeps that single source of truth instead of forking the screen or reaching in from outside to overlay a button on top of someone else's layout. The compact route passes `fab`, the sidebar usage does not.
- **A `newSession` prop on `SessionListActions`, not a separate header component.** Same reasoning: one small component, one conditional icon, used identically by both call sites today.
- **The FAB's accessible label reuses `nav.newSession`**, the same string the header icon used. No new i18n keys: same action, same wording, just a different control.

## Risks / Trade-offs

- [The FAB is a new fixed element at the bottom-right; on very small screens or with a dense list it could sit close to the last visible row] → Mitigation: the list's bottom padding grows enough to clear the FAB's height plus its margin, verified against the existing `styles.list` padding rather than guessed.
