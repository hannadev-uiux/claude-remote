## Context

The session screen (`app/(main)/session/[id]/index.tsx`) puts the mute button and a terminal `IconButton` in the header (`headerActions`). `ConversationScreen` always renders `KeyBar` when `onKey` is passed. The transcript store already pages older entries with `loadOlder` (`session.history`).

## Goals / Non-Goals

**Goals:** one header button with a native-feeling menu; a remembered, default-hidden key bar; a way to jump to an earlier prompt.

**Non-Goals:** a keyboard accessory toolbar with the keys (#55); search inside the transcript; editing or re-sending old prompts.

## Decisions

- **No new native dependency.** iOS uses `ActionSheetIOS` (native sheet, `disabledButtonIndices` and a `message` with the read-only reason). Android uses a `Modal` with a small card anchored under the header's right edge (Material overflow menu look), with disabled items dimmed and the reason as a footer line. This keeps the feature deliverable by OTA. Alternatives (`zeego`, `@react-native-menu/menu`, `@expo/ui` context menus) need a new build.
- **Generic `ActionMenu` in `src/ui`** taking `{ items: { key, label, disabled?, onPress }[], disabledReason? }`, so other screens can reuse it. Building the items for the session is a pure function (`sessionMenuItems`) so the read-only rules are tested.
- **Key bar preference** lives in a small Zustand store persisted with `expo-secure-store` (the app already uses it for the voice language and update channel; no AsyncStorage dependency). It is restored once at app start; until restored it is `false` (hidden), which is also the default.
- **History = list of earlier prompts.** It reuses the transcript stream already loaded for the conversation (no new message). `promptHistory(entries)` returns user prompts newest first, skipping empty ones. The sheet lives inside `ConversationScreen`, which owns the list ref, so tapping a prompt calls `scrollToItem` on the timeline item with the same key (`viewPosition: 0`). Prompts not yet in the timeline cannot exist, because the sheet only lists loaded entries.

## Risks / Trade-offs

- [`scrollToItem` on FlashList with variable heights may land slightly off] → acceptable; the item is brought into view and FlashList corrects after layout.
- [Android menu is not the system popup] → styled like it and dismissed by tapping outside or Back.
