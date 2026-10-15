## Context

Snapshot and events come from the daemon (change 05).

## Goals / Non-Goals

**Goals:** smooth scrolling with dozens of sessions.

**Non-Goals:** text search.

## Decisions

- **`useSessionsStore`** (Zustand) with a `Map` by id, fed by `sessions.snapshot` and events; pure, tested `selectGroupedSessions` selector (grouping and sorting).
- **FlashList** with header and session items (`getItemType`).
- **Relative time** with `Intl.RelativeTimeFormat` (pt-BR), no extra dependency.
- Tapping goes to `/session/[id]`.

## Risks / Trade-offs

- [Many events in a row] → updates batched by Zustand itself; memoized items.
