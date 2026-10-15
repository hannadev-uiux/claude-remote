## 1. Spike

- [x] 1.1 Validated: `react-native-key-command` installs (`npx expo install`) and actually compiles in the development build (CocoaPods installed via Homebrew; `expo prebuild --clean` + `xcodebuild -workspace ClaudeRemote.xcworkspace -scheme ClaudeRemote -sdk iphonesimulator build` → `** BUILD SUCCEEDED **`, no warnings/errors in the patched files). It needed a patch to `AppDelegate.swift` (`keyCommands`/`handleKeyCommand`, read and confirmed in the library's native source, not just its README) and an import in the bridging header — both via new config plugins in `app.config.ts` (`withKeyCommandAppDelegate`, `withKeyCommandBridgingHeader`), never editing `ios/` by hand. Only actually pressing the keys on a booted simulator is still missing (no GUI-driving tool available) — see the closing note

## 2. Layout infrastructure

- [x] 2.1 Create `useWidthClass()` in `src/core/layout` (680pt breakpoint over `useWindowDimensions`); verified with Vitest tests simulating different widths (`pnpm --filter mobile test`)
- [x] 2.2 Create a `MasterDetailLayout` component in `src/ui` that takes the master pane (`sidebar`) and renders `children` (the Expo Router `Stack`, always mounted) as the detail pane; verified with typecheck and `npx expo export --platform ios`

## 3. Orientation and supportsTablet

- [x] 3.1 In `apps/mobile/app.config.ts`: `supportsTablet: true`, keep `orientation: 'portrait'` (Expo only ever writes the unsuffixed key, confirmed in `@expo/config-plugins`'s source) and add a `withPerIdiomOrientation` config plugin writing only `UISupportedInterfaceOrientations~ipad` (portrait + landscape) to `Info.plist`; verified with `npx expo export --platform ios` and inspecting the generated `Info.plist`

## 4. Master-detail navigation in the shell

- [x] 4.1 `(main)/_layout.tsx` always renders `MasterDetailLayout` around the current `Stack` (the `Stack` is never unmounted), with the master pane `null` in compact class and the session list in regular class; code complete, typecheck/tests green — manual verification on the iPad simulator toggling Split View is still pending (see closing note)
- [x] 4.2 Empty state in the detail pane when no session is open in regular width (`EmptyState` in `index.tsx` when `widthClass === 'regular'`); verified visually by reading the code, simulator check still pending
- [x] 4.3 Active session/route in the detail pane derived from `usePathname()` (`extractSessionIdFromPathname`), no duplicated store; verified with a test of the selector (`active-session.test.ts`)
- [x] 4.4 Shrinking the window to compact width goes back to stack navigation showing the last open screen full-screen, without losing the session — guaranteed structurally: `MasterDetailLayout` always keeps the `Stack` in the same tree slot, so it never unmounts when crossing the breakpoint; manual verification shrinking Split View still pending

## 5. Pointer and hardware keyboard in the shell

- [x] 5.1 Hover (`onHoverIn`/`onHoverOut`) on session list items (`SessionRow`) and shell buttons (`IconButton`); code complete, manual trackpad verification on the simulator still pending
- [x] 5.2 Cmd+N (new session), Cmd+, (settings) and Esc outside a text field (close the detail pane) shortcuts via `react-native-key-command` (`useShellKeyCommands` in `(main)/_layout.tsx`, using `TextInput.State.currentlyFocusedInput()` to guard Esc); code complete, typecheck/tests/native build green — actually pressing the keys on a booted simulator still pending

## 6. Session list

- [x] 6.1 Visual highlight of the selected session when the list is shown as the master pane (`SessionRow` gained a `selected` prop); the logic for which session is selected is the same pure function tested in 4.3 — `SessionRow` itself is not Vitest-tested (a React Native component, outside the project's convention)
- [x] 6.2 Arrow-key navigation and opening with Enter on the focused list (`SessionsScreen`, `interactive` prop, a keyboard cursor kept separate from the open session — pure logic in `keyboard-nav.ts`/tested in `keyboard-nav.test.ts`); guarded by `TextInput.State.currentlyFocusedInput()` so it doesn't steal the arrow keys from the prompt field. Code complete, typecheck/tests/native build green — manual test with a hardware keyboard on the simulator still pending

## 7. Conversation

- [x] 7.1 Cmd+Enter sends the prompt (`SmartComposer`, a guard replicating exactly the send button's `canSend`) and a bare Enter inserts a newline — the multiline `TextInput`'s default behavior, no extra code needed. Code complete, typecheck/tests/native build green — manual test with a hardware keyboard on the simulator still pending
- [x] 7.2 Max reading width for the conversation content (text, diffs, tool calls) in wide panes, via a new `maxContentWidth` token in `src/core/theme` (`width: '100%', maxWidth, alignSelf: 'center'` on the `FlashList`'s `contentContainerStyle`); confirmed by reading the code that no inner component (`ToolCallCard`, `DiffView`, `Markdown`) assumes full-screen width; visual check on a 12.9" iPad in landscape still pending

## 8. Autocomplete

- [x] 8.1 Anchor the suggestions to the prompt field — already satisfied by the existing structure: `SuggestionList` renders in normal flow (`accessory`) above the input row, inside `KeyboardAvoidingView`; with no virtual keyboard (hardware keyboard connected) `KeyboardAvoidingView`'s `padding` is zero and the composer with the suggestions stays anchored to the bottom of the screen by normal flex — no code assumes the virtual keyboard is visible. Manual verification with a hardware keyboard on the simulator still pending
- [x] 8.2 Contain the suggestion list within the detail pane's width — already satisfied by task 4.1/4.4: `ConversationScreen`/`SmartComposer`/`SuggestionList` render inside the `Stack`, which now lives confined to the detail pane (`MasterDetailLayout`), with no absolute full-screen width anywhere in the code (confirmed by grep)

## 9. Final verification

- [x] 9.1 `pnpm check` green (typecheck + tests + Biome) — all tests passing across daemon, mobile and protocol; typecheck and Biome clean in all three packages
- [ ] 9.2 Manual check on the iPad simulator: portrait/landscape rotation, narrow↔wide Split View, Slide Over; and on the iPhone simulator: confirm navigation stays in a stack and in portrait, with no regression
