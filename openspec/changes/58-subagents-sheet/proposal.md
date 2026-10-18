# 58 · Subagents sheet instead of the strip

## Why

The session screen opens with a horizontal strip of subagent chips (`SubagentStrip`). It costs vertical space in every session, scrolls by accident and becomes noise in sessions with many subagents. The 2026-10-18 redesign (#107, epic #162) moves subagents into the More options menu and a sheet, and keeps the feature discoverable with an accent dot on the menu button while any subagent runs.

## What Changes

- **Protocol**: `SubagentInfo` gains `startedAt` (ISO, `null` when unknown) and `toolCount` (tool uses seen in its transcript). Both have defaults, so older daemons keep working.
- **Daemon**: the subagent tracker records when a subagent was first seen (the transcript file's creation time, else the discovery time) and counts its tool uses incrementally, reading only the bytes appended since the last change and parsing them with the transcript parser (the `.jsonl` format stays inside `features/transcript/parser.ts`).
- **App**: the strip is removed from the session screen. When the session has subagents, the More options menu offers **Subagents (N)**, or **Subagents (N · M running)** while any runs; it opens a bottom sheet sorted running first, each row with the label, a state pill, the elapsed time (live while running, the total once done) and the tool count; tapping a row opens the subagent conversation. The menu button shows an accent dot while any subagent runs. Nested rows in the session list are unchanged. `formatElapsed` moves to `core/utils/time.ts`, shared with the waiting strip.
- Copy in pt-BR, en-US and es-ES.

## Impact

- `packages/protocol/src/domain.ts` (`SubagentInfoSchema`).
- `apps/daemon/src/features/subagents/tracker.ts` and `apps/daemon/test/subagents.test.ts`.
- `apps/mobile`: `features/subagents/{sort.ts,SubagentList.tsx,SubagentsSheet.tsx}`, `features/conversation/session-menu.ts`, `ui/ActionMenu.tsx`, `app/(main)/session/[id]/index.tsx`, `core/utils/time.ts`, locales.
- Specs: `subagents` (MODIFIED "Subagent discovery" and "Nesting in the app").
