# 64 · iPad: three columns with an inspector, overlay sidebar in portrait, keyboard hints and shortcuts

## Why

On iPad the app only splits list and conversation at 680 pt; the terminal, the subagents and the session details are reachable only through routes and sheets, portrait wastes the sidebar's width, and a hardware keyboard gets ⌘N, ⌘, and ⌘⏎ with nothing telling the user. #159 (epic #162) brings the tablet layout of the prototypes: a third column with an inspector, an overlay sidebar in portrait, a hints row under the composer and the shortcuts it announces.

## What Changes

- **Layout classes**: `compact` (< 700 pt: phone layout, Split View 1/3, Slide Over), `regular` (700–1099 pt: two columns; the inspector opens as a side sheet from a header button; in portrait the sidebar slides over the dimmed conversation from a ☰ button) and `wide` (≥ 1100 pt: sidebar 340 · conversation · inspector 320). Android tablets use the same breakpoints in dp.
- **Inspector**: tabs **Terminal** (the pane mirror), **Subagents** (count in the tab, the rows of the subagents sheet) and **Details** (the rows of the session details sheet); resizable between 280 and 420 pt by dragging its edge; its tab and width are kept in a store. The subagents and details sheets reuse the same row components.
- **Keyboard hints** under the composer while a hardware keyboard is attached on a tablet: `⏎ queue`, `⌘⏎ send now`, `⌘1–9 session`, `⌘K search`, `⌘T terminal`, `⌘. esc`, `⌘⇧M mode` and, while a permission waits, `⌘A / ⌘D answer`. With a hardware keyboard on a tablet, Return in the composer sends (queues while busy) instead of inserting a newline.
- **Shortcuts**: ⌘1–9 open the nth session of the list; ⌘K focuses the search; ⌘T opens the terminal (the inspector's Terminal tab on tablets); ⌘. sends Esc; ⌘⇧M cycles the permission mode through default → accept edits → plan; ⌘A / ⌘D answer the oldest pending tool permission of the open session (never while typing).
- Copy in pt-BR, en-US and es-ES.

## Impact

- `apps/mobile/src/core/layout/*`, `src/ui/MasterDetailLayout.tsx`, `src/app/(main)/_layout.tsx`, `src/app/(main)/session/[id]/index.tsx`.
- New `features/inspector/{store,logic,InspectorPane}.ts(x)`, `features/shortcuts/{logic,use-session-shortcuts}.ts`, `features/conversation/{keyboard-hints.ts,components/KeyboardHints.tsx}`, `features/subagents/SubagentRows.tsx`, `features/sessions/components/SessionDetailsList.tsx`, `features/sessions/search-focus.ts`.
- `features/conversation/components/PromptComposer.tsx`, `features/autocomplete/SmartComposer.tsx`, `features/sessions/components/SessionSearch.tsx`, the two sheets, locales.
- Specs: `app-shell` (ADDED Tablet layout, Hardware keyboard shortcuts), `app-conversation` (ADDED Keyboard hints).
