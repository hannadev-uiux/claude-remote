# 63 · Live status: state colors, recent glyphs, Allow/Deny from the lock screen

## Why

The live status still wears the pre-redesign look: an SF symbol per state, three text lines of steps, a small timer, and nothing to do about a pending permission without opening the app. #158 (epic #162) brings it to the identity prototypes: the mark as the only icon, color encoding only the state, a large tabular timer, a row of the last five step glyphs, an indeterminate bar while working, and Deny / Allow answered from the lock screen and the Dynamic Island.

## What Changes

- **Protocol**: `LiveStatusProps` gains `glyphs` (last five step glyphs, newest first), `pending` (`{ requestId, tool, allow, deny }` while a tool permission waits; labels already translated) and `hint` (short translated line for done: "total", and closed: "transcript kept · resume from the app"). All have defaults for older daemons.
- **Daemon**: the live status keeps the pending permission (set on `permission.requested` for tool permissions, cleared when resolved, on a new prompt, on stop and on end) and the last five step categories; `liveProps` maps them to glyphs (`⌘` command, `✎` edit, `⌕` search, `⇄` web, `⌥` subagent, `?` permission, `·` other) and fills `pending` and `hint`; a pending change is sent at once.
- **App (iOS widget)**: lock screen = `profile · machine`, session title, folder, large tabular timer in the state color, state line (state · step · tools), glyph row with the current one tinted, indeterminate bar while working; waiting adds Deny / Allow buttons whose targets carry the request id; done freezes the timer with "total"; closed stays muted with its hint. Dynamic Island: compact = mark + timer (or glyph), minimal = mark + state dot, expanded = the lock screen content. The app answers the buttons through `permission.respond` with a short-lived connection, like notification actions.
- **Android**: the notification body carries state · step · tools and the glyph row; action buttons stay out of this change (they need a data-message renderer, tracked separately).
- Copy in pt-BR, en-US and es-ES.

## Impact

- `packages/protocol/src/domain.ts` (`LivePendingSchema`, `LiveStatusPropsSchema`).
- `apps/daemon/src/features/live-status/{status,index}.ts`, `src/core/i18n/*.ts`, `src/features/push/sender.ts` (Android body), tests.
- `apps/mobile/src/features/live-status/{SessionActivity.tsx,logic.ts,use-live-status.ts}`, tests.
- Specs: `live-status` (MODIFIED Live status content, Live status updates, Live status protocol).
