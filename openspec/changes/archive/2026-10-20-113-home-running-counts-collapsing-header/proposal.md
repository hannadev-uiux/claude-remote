## Why

The machine line (`listSummary` in `apps/mobile/src/features/sessions/summary.ts`, rendered by `MachineLine.tsx`) only counts sessions in the list and the distinct agent types among them — "Macbook · 32 sessions" and "1 agent" — with no sign of how many are actually running right now, which is what the user wants at a glance; "1 agent" is also easy to misread as "1 session running" (#232). Separately, the header (title row, machine line, filter chips, search field) stays fully expanded while scrolling, so on a phone only a few session rows are visible at once.

## What Changes

- **Richer counts.** `listSummary` returns `{ sessions, running, waiting, tasks, agents, agentsRunning }`: `tasks` sums background tasks and running subagents across every session in the list; `agentsRunning` is how many distinct agents have at least one running session. The machine line shows the non-zero parts — "Macbook · 32 sessions · 3 running · 1 waiting · +5 tasks" — and "2 agents · 1 running" on the right. Tapping "running" or "waiting" applies the existing `active` filter chip (the list has no separate running/waiting filter, so this is the closest match, not a new filter dimension).
- **Collapsing header on compact width.** Scrolling the session list down past the top collapses the header (machine line + filter chips) into a slim compact bar: a small mark glyph on the left, the search field in the middle, and a filters button on the right that shows a dot when a filter is active. Scrolling up by any amount, or reaching the top, restores the full header. The transition is driven by `react-native-reanimated` (`useAnimatedScrollHandler`, `useAnimatedStyle`, `interpolate`) on the UI thread, skips the animation (snaps) when the OS "Reduce Motion" setting is on (`useReducedMotion`), and is disabled on regular width (the sidebar), where the full header always shows, matching how the sidebar already renders its own fixed title row outside this component.
- **Filters sheet.** The compact bar's filters button opens a bottom sheet with the same profile/active/ended/sort chips as the full header's row, reusing one `SessionFilterChips` list so the two layouts can't drift apart.
- `SessionSearch` gains an optional `focusable` prop (default `true`): the instance in the currently-hidden header layer sets it to `false` so a `⌘K`/search-focus request cannot focus an invisible field.

## Capabilities

### Modified Capabilities
- `app-session-list`: "Header and machine line" now describes the running/waiting/tasks counts and the agents-running count.

### New Capabilities (as a delta on `app-session-list`)
- "Collapsing header on scroll": the compact-width scroll behavior and the filters sheet.

## Impact

- `apps/mobile/src/features/sessions/summary.ts`, `summary.test.ts`: richer `ListSummary`.
- `apps/mobile/src/features/sessions/components/MachineLine.tsx`: new counts, tappable running/waiting.
- `apps/mobile/src/features/sessions/components/SessionFilterChips.tsx` (new): the chip list shared by the header row and the filters sheet.
- `apps/mobile/src/features/sessions/components/SessionFiltersSheet.tsx` (new): the compact bar's filters sheet.
- `apps/mobile/src/features/sessions/components/SessionSearch.tsx`: optional `focusable` prop.
- `apps/mobile/src/features/sessions/SessionsScreen.tsx`: the animated collapsing container, compact bar, `AnimatedFlashList`.
- i18n (`sessions.runningCount`, `waitingCount`, `tasksCount`, `filters`, filters-sheet title) in pt-BR, en-US, es-ES.
- `openspec/specs/app-session-list/spec.md`.
