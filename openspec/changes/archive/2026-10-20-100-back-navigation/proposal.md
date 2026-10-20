## Why

The back button ("<") behaves inconsistently (issues #265 and #268). It disappears on some screens, and it can stay on the session list, where tapping it seems to do nothing. Three causes were found in the navigation setup:

- **No anchor under deep links.** The `(main)` stack has no anchor. A session opened from a link (the Live Activity or a widget URL, a cold start from a notification) becomes the first screen of the stack, so it has no back button and no back swipe. A later `router.navigate('/')` (⌘F on a phone) then pushes the list on top of it, and the list shows a "<" that leads back to the session.
- **☰ replaces back everywhere.** On a portrait tablet, the ☰ that opens the sidebar is set as `headerLeft` for every screen of the stack. It replaces the back button on the terminal, subagent, settings, report and permissions screens too, not only on the list and the conversation as the tablet spec intends.
- **Sessions pile up in the sidebar.** Picking a session in the sidebar pushes it on top of the one already open, so back walks through earlier sessions instead of returning to the list.

## What Changes

- The `(main)` stack is anchored on the list (`unstable_settings.anchor = 'index'`). Every screen opened from a link or a notification has the list under it.
- The list never shows a back button.
- On a portrait tablet, ☰ replaces the back button only on the list and on a session's conversation. Deeper screens keep their back button.
- Opening a session from the list, the waiting strip, a notification or a keyboard shortcut:
  - does nothing when that session's conversation is already shown;
  - replaces the open conversation when another session's conversation is shown;
  - is pushed otherwise.

  Back from a conversation always leads to the list or to the screen the user came from.
- ⌘F on a phone returns to the list with `dismissTo('/')` instead of `navigate('/')`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-shell`: back navigation rules

## Impact

- `apps/mobile/src/app/(main)/_layout.tsx`: anchor, per-screen ☰, no back on the list, current path for navigation
- `apps/mobile/src/features/sessions/session-navigation.ts` (new, pure `openSessionMode`, tested) and `open-session.ts` (new, `openSession` and the current path)
- Callers: `SessionRow`, `SessionsScreen`, `WaitingStrip`, `use-push`, `use-session-shortcuts`
