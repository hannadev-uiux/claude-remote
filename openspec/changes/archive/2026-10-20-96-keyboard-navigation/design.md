## Context

Shortcuts are registered with `react-native-key-command`'s `addListener` in four places (`(main)/_layout.tsx`, `use-session-shortcuts.ts`, `SessionsScreen.tsx`, `SmartComposer.tsx`). Each `addListener` registers the combination natively and its cleanup unregisters it, whoever else still listens to it; on iOS the native side compares inputs by pointer, so registrations also pile up. There is no notion of "the sheet on top handles Esc first". On Android the library needs `MainActivity.onKeyDown` to call `KeyCommandModule.onKeyDownEvent`, which the app never added, so no shortcut works there. The library offers no discoverability titles, so the iPadOS ⌘-hold overlay cannot list our shortcuts.

## Goals / Non-Goals

**Goals:**
- Back, list navigation, previous/next session, More options, focus input and a cheat sheet on every layout.
- Esc layered: the topmost thing (sheet, menu, suggestions, focused field) handles it before "go back".
- Android gets the same shortcuts.

**Non-Goals:**
- The iPadOS ⌘-hold shortcut overlay (needs `discoverabilityTitle`, not exposed by the library).
- Enter / Shift+Enter in the composer and the autocomplete keys other than Esc (#128).
- Shortcuts on the raw terminal screen other than ⌘[ (its keys go to tmux).

## Decisions

- **Key registry (`core/keyboard`).** `key-stack.ts` is pure: a map from a combination id (`input|modifierFlags`) to a list of handlers; `dispatch` calls them newest first and stops at the first that does not return `false`. `key-commands.ts` registers each combination natively once, the first time someone listens, and never unregisters it (a key without handlers just does nothing); one `onKeyCommand` subscription to the library's event emitter matches the event the way the library does (lowercased input, exact modifier flags) and dispatches. `useKeyCommand(combo, handler, enabled)` keeps the handler in a ref, so callers register once per `enabled` change. All existing `addListener` calls move to it.
- **Esc layering by registration order.** The shell's Esc handler mounts first (oldest); sheets, the Android menu and the composer's suggestions add theirs only while open, so they are newer and win. The shell handler: a focused field → blur it; otherwise `backAction(pathname, 'escape')`.
- **`backAction(pathname, key)` (pure):** `/` → none; `/session/<id>` → `list` (`router.dismissTo('/')`); `/session/<id>/terminal` → none for Esc, `back` for ⌘[; anything else → `back` (`router.back()` when it can). ⌘[ ignores focused fields (blurs and goes back in one press).
- **Previous / next session.** `adjacentSessionId(ids, current, delta)` returns the neighbor in the listed order (saved sort and pins, no filter, the same order ⌘1–9 uses), `null` at either end; no wrap. Navigation uses `router.replace`, so back still returns to the list. ⌘↑ / ⌘↓ are ignored while a field is focused (they move the caret there); ⌥⌘↑ / ⌥⌘↓ do the same and are the ones to use from the composer when the platform delivers them.
- **List arrows on phones.** `SessionsScreen` already handles ↑ / ↓ / Enter when `interactive`; the phone index route passes `interactive` only while the pathname is `/` (the stack keeps it mounted under a session). The cursor change scrolls the list with `scrollToItem({ viewPosition: 0.5 })`.
- **More options on request.** `ActionMenu` takes an `openRequests` counter; a change opens it (iOS action sheet or Android menu). The Android menu keeps a highlighted index while open (↑ / ↓ skip disabled items, Enter chooses, Esc closes) through `useKeyCommand`. ⌘⇧O bumps the counter from the session route. ⌘. stays "send Esc to the session".
- **Requests through a tiny store.** `features/shortcuts/store.ts` holds counters for "focus the composer" and "open the session menu" plus the cheat sheet's open flag, like `search-focus.ts` does for ⌘K.
- **Cheat sheet content is data.** `shortcutSheet(t)` returns the groups (Navigation, Session, Composer) with `keys` and translated labels; the sheet only renders it. A test checks every entry has a label.
- **Android activity.** `withKeyCommandMainActivity` adds `onKeyDown` forwarding to `KeyCommandModule.getInstance()?.onKeyDownEvent(...)` before calling `super`, idempotently. Android reports Ctrl for ⌘, so the same registrations match.

## Risks / Trade-offs

- [iOS may give the focused text view priority for plain arrows and Enter] → those shortcuts already ignore focused fields; Esc is not a text-editing key, so it reaches the registry.
- [Native registrations are never removed] → a handful of combinations; a key nobody handles is a no-op, and this avoids the library's broken unregister.
- [On Android the library reports only letters, digits and the special keys (punctuation arrives as `0`)] → ⌘/, ⌘., ⌘, and ⌘[ do not reach the app there; Esc, the arrows, Enter and the letter shortcuts do. Fixing it needs a change in the library.
- [Android needs a new build] → the JS side works without it; the plugin only adds the forwarding.
