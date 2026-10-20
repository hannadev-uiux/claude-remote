## Why

Two problems on the phone's on-screen keyboard (issue #223):

- **The toolbar is partly hidden.** The keyboard toolbar (the special keys and `@`/`/` row at the bottom of the composer) is partly covered by the iOS QuickType suggestions bar. The conversation's `KeyboardAvoidingView` uses a fixed `keyboardVerticalOffset={90}` as the distance from the top of the window to its parent. The real distance is the navigation header, plus the connection banner, plus the session header, and it is often larger (devices with the Dynamic Island, iPad, a visible banner). The view then pads less than the keyboard covers, and the bottom of the composer, the toolbar, ends up under the top of the keyboard, where the suggestions bar sits.
- **No autocorrect.** The message input disables corrections (`autoCorrect={false}`), so accents and typos are not fixed ("nao" → "não"). That makes writing prompts in Portuguese or Spanish slow.

## What Changes

- **Toolbar position:** the conversation measures where it starts in the window (`measureInWindow` on layout) and uses that as the keyboard offset. 90 stays only until the first measurement. The composer and its toolbar then sit right above the keyboard, whatever its height: with or without the suggestions bar, and as it changes. This is JavaScript only, so no new build is needed.
- **Autocorrect:**
  - The message input autocorrects and spell checks by default. Capitalization stays off.
  - It switches off while the message is a slash command (`/…`) or while an `@`/`/` autocomplete trigger is under the cursor, where a correction would break it.
  - A new setting, Settings → Keyboard → "Autocorrect in the message input" (on by default), turns it off for users who prefer raw input.
  - The raw terminal is unchanged, because it never autocorrects.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-conversation`: composer placement above the keyboard, autocorrect in the message input

## Impact

- `apps/mobile/src/features/conversation`:
  - `autocorrect.ts` (`composerAutocorrect`, `keyboardOffset`, tested);
  - `autocorrect-store.ts`;
  - `ConversationScreen` (measured offset);
  - `PromptComposer` (`autoCorrect`, `spellCheck`).
- `apps/mobile/src/features/autocomplete/SmartComposer.tsx`, `features/settings/KeyboardCard.tsx`, root layout (restore); i18n
