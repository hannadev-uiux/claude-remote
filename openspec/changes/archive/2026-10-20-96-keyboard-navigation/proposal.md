## Why

With a hardware keyboard the app still needs the screen for basic navigation (#127). After #180, ⌘1–9, ⌘K, ⌘T, ⌘., ⌘⇧M and ⌘A / ⌘D work on every layout, but on phones Esc does not go back, the arrows do not move in the list, there is no way to step to the previous or next session from inside one, and the More options menu, the message input and a list of the shortcuts have no key. On Android the key events never reach the app at all: the activity does not forward them to `react-native-key-command`.

## What Changes

- **Esc / ⌘[ go back** on every layout: from a session to the list, from any other pushed screen (settings, new session, terminal, subagent) one step back. Esc while a text field has focus first closes the autocomplete list (composer) or blurs the field; the next Esc goes back. Esc is left alone on the raw terminal screen, where it belongs to tmux; ⌘[ still leaves it.
- **↑ / ↓ + Enter in the list on phones** too (today only in the tablet master pane), with the focus ring and the list scrolling to keep the selected row visible. Only while the list is the visible screen.
- **⌘↑ / ⌘↓** (also **⌥⌘↑ / ⌥⌘↓**) open the previous / next session of the list from inside a session, replacing the current one so "back" still leads to the list.
- **⌘⇧O** opens the session's **More options** menu. The app-drawn menu (Android) moves with ↑ / ↓, chooses with Enter and closes with Esc; the iOS action sheet keeps its system keyboard handling.
- **⌘L** focuses the message input of the open session; **⌘F** is an alias of ⌘K.
- **⌘/** opens a **Keyboard shortcuts** sheet listing every shortcut (translated), closed with Esc or ⌘/; the hints row under the composer gains `⌘/ shortcuts`.
- **One key registry**: every shortcut goes through a single registration per key combination with a handler stack (newest first, a handler can pass), so screens that come and go no longer unregister a key another screen still listens to.
- **Android**: the main activity forwards hardware key events to `react-native-key-command` (config plugin), so the same shortcuts work there (Ctrl stands for ⌘).

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-shell`: Hardware keyboard shortcuts: back, list arrows on phones, previous/next session, More options, focus the input, the shortcuts sheet, Android key events.
- `app-conversation`: Keyboard hints: the row also shows `⌘/ shortcuts`.

## Impact

- `apps/mobile/src/core/keyboard/` (new): `key-stack.ts` (pure handler stack, tested), `key-commands.ts` (native registration once per combination, `onKeyCommand`, `useKeyCommand`).
- `apps/mobile/src/features/shortcuts/`: `logic.ts` gains `backAction`, `adjacentSessionId`, `shortcutSheet` (tested); `use-session-shortcuts.ts` gains the new keys; `KeyboardShortcutsSheet.tsx` and a small store for the sheet, the composer focus and the menu requests.
- `apps/mobile/src/app/(main)/_layout.tsx`, `index.tsx`, `session/[id]/index.tsx`; `SessionsScreen.tsx` (arrows on phones, scroll to the cursor); `SmartComposer.tsx` (Esc closes suggestions, ⌘L); `src/ui/ActionMenu.tsx` (open on request, keyboard in the Android menu).
- `apps/mobile/app.config.ts`: `withKeyCommandMainActivity` (native change: needs a new build on Android).
- i18n: `keys.*` and `shortcuts.*` in pt-BR, en-US and es-ES. No protocol or daemon change.
