## Why

With a hardware keyboard the message input still behaves like a phone's on-screen keyboard (#128). Since #180, Return sends only on tablets. There, nothing inserts a new line, because `submitBehavior: 'submit'` swallows every Return. The `@` / `/` suggestions cannot be driven from the keyboard either. Some people also want the on-screen Return key to send.

## What Changes

- **Return sends on iPhone too** with a hardware keyboard (detected as on iPad: the composer is focused and no software keyboard is on screen). It queues while the session is busy (#110); **⌘⏎** keeps sending now.
- **⇧⏎ inserts a new line** at the cursor whenever Return sends (iOS and iPadOS).
- **Suggestions from the keyboard:** while the `@` / `/` list is open and has rows, the first row is highlighted. **Return** and **Tab** accept the highlighted row instead of sending, **↑ / ↓** move the highlight, and **Esc** closes the list (#127).
- **"Return key sends" setting** (Settings → Keyboard, per device, off by default). With it, the on-screen keyboard's Return sends and is labeled "Send". There is then no new line from the on-screen keyboard.
- **Hints row on phones:** a short row with `⏎ queue`, `⇧⏎ new line`, `⌘⏎ send now`, `⌘/ shortcuts`. Tablets also gain `⇧⏎ new line` (iOS).
- **Key priority:** the shortcut registry can ask for priority, so a focused text view lets the key through. That is needed for Shift+Return, the arrows and Tab while typing. It is granted only while the composer needs those keys. A native registration is re-registered when its priority changes. Events repeated within 15 ms are dropped, because older builds keep duplicates.
- **`react-native-key-command` patch (iOS):** an optional `priority` per command (`wantsPriorityOverSystemBehavior`), and unregistering compares inputs by value instead of by pointer.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-conversation`: Keyboard hints: Return sends on iPhone too, ⇧⏎ inserts a new line, phone hints row, the "Return key sends" setting.
- `autocomplete`: Keyboard in the suggestions: highlight, Return / Tab accept, ↑ / ↓ move.
- `app-shell`: Settings screen gains the Keyboard section.

## Impact

- `apps/mobile/src/core/keyboard/`: priority in the stack and native sync (tests).
- `apps/mobile/src/features/conversation/`: `return-key.ts` (pure: insert at selection, what Return does, tests), `keyboard-toolbar.ts` (`hardwareKeyboard` takes the platform and layout), `keyboard-hints.ts` (phone row), `return-key-store.ts`, `PromptComposer.tsx`.
- `apps/mobile/src/features/autocomplete/`: `keyboard.ts` (pickable rows, highlight; tests), `SmartComposer.tsx`, `SuggestionList.tsx` (highlighted row).
- `apps/mobile/src/features/settings/KeyboardCard.tsx`; `src/app/_layout.tsx` restores the setting.
- `patches/react-native-key-command@1.0.18.patch` (native: needs a new iOS build). i18n in pt-BR, en-US and es-ES. No protocol or daemon change.
