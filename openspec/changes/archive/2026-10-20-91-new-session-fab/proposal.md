## Why

The "New session" action on the compact (phone) session list is a small `+` icon in the header, next to Settings. It is far from the thumb, easy to miss, and visually reads as a secondary action, even though starting a session is one of the main things to do from this screen.

## What Changes

- On compact width (phone), the header no longer shows the `+` new-session icon; a floating action button (FAB) at the bottom-right of the session list opens `/new` instead: round, accent-colored, `Plus` icon, accessible label "New session" (reusing the existing `nav.newSession` translation), inside the safe area so it clears the home indicator, with the list's bottom padding increased so the FAB never covers the last row.
- On regular width (iPad, wide Split View), the master pane header keeps both the new-session and settings actions exactly as today — no FAB there, since the header action is already within reach on that layout.
- Cmd+N keeps opening `/new`, unchanged (already handled at the shell level, outside the session list).
- Pressing the FAB gives the same selection haptic as the app's other primary actions.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-session-list`: the header's new-session action only shows on regular width; compact width gets a floating action button instead.

## Impact

- `apps/mobile/src/features/sessions/components/SessionListActions.tsx`: the new-session icon becomes conditional (a `newSession` prop), so the compact header can drop it while the sidebar header keeps it.
- `apps/mobile/src/app/(main)/index.tsx`: passes `newSession={false}` to `SessionListActions` in the compact header.
- `apps/mobile/src/features/sessions/components/NewSessionFab.tsx` (new): the floating action button.
- `apps/mobile/src/features/sessions/SessionsScreen.tsx`: renders the FAB when asked to (a `fab` prop), and pads the list's bottom accordingly; `index.tsx` passes `fab` only on the compact route, the sidebar usage in `_layout.tsx` does not.
- No i18n additions: the FAB reuses the existing `nav.newSession` string.
