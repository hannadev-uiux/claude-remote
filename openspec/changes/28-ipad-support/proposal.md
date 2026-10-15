## Why

The app locks its UI to the iPhone form factor today: `app.config.ts` sets `supportsTablet: false` and `orientation: 'portrait'`, and the app-foundation change's design.md (`openspec/changes/archive/2026-10-14-10-app-foundation`) lists tablets as an explicit non-goal. On iPad it runs in iPhone compatibility (upscaled) mode, with a single-screen stack navigator, a suggestion bar built for a virtual keyboard, and no pointer/trackpad or hardware-keyboard affordances — even though it's exactly the kind of device (large screen, a hardware keyboard close at hand) where following long Claude Code sessions is most comfortable.

## What Changes

- `app.config.ts`: `supportsTablet: true`; portrait-only orientation on iPhone and free (portrait + landscape) on iPad, via the native `UISupportedInterfaceOrientations` / `UISupportedInterfaceOrientations~ipad` `Info.plist` keys.
- Adaptive navigation by width class: in compact width (iPhone, or iPad in Slide Over/narrow Split View) the current screen-by-screen stack is kept; in regular width (iPad full screen or wide Split View, portrait or landscape) it becomes master-detail — the session list fixed on the left and the active screen (conversation, new session, settings, terminal, subagent) in the detail pane.
- Pointer/trackpad affordances (hover on list rows and buttons) and hardware-keyboard shortcuts at the shell level: new session, settings, navigate sessions, close the detail pane.
- The session list visually marks the session open in the detail pane when in master-detail, and accepts arrow/Enter keyboard navigation.
- Conversation: a hardware-keyboard shortcut to send the prompt (Cmd+Enter) without changing the send button's current behavior; a max reading width for content (text, diffs, tool calls) inside the detail pane on very wide screens, instead of stretching edge to edge.
- Autocomplete: the suggestion bar stops assuming the virtual keyboard is always visible (hardware keyboard attached) and anchors correctly to the prompt field in the master-detail layout too.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-shell`: adaptive navigation by width class/orientation (master-detail on iPad), pointer affordances and hardware-keyboard shortcuts in the shell, multitasking behavior (Split View/Slide Over).
- `app-session-list`: the list marks the selected session when shown as the master pane and accepts keyboard navigation.
- `app-conversation`: hardware-keyboard shortcut to send the prompt and a max reading width in wide panes.
- `autocomplete`: suggestion positioning no longer depends on the virtual keyboard being present.

## Impact

- `apps/mobile/app.config.ts`: `supportsTablet`, per-idiom orientation (plist keys per idiom, same pattern as the existing `withSceneLifecycle`/`withFirebaseCocoaPods` plugins), plus two new config plugins for `react-native-key-command`'s `AppDelegate.swift`/bridging-header hookup.
- `apps/mobile/src/app/(main)/_layout.tsx`: the navigation shell now chooses between stack and master-detail.
- `apps/mobile/src/core` (new width-class/breakpoint utility) and `apps/mobile/src/ui` (master-detail layout component, hover).
- `apps/mobile/src/features/sessions` (list with selection state and keyboard navigation), `apps/mobile/src/features/conversation` (keyboard shortcut, max width), `apps/mobile/src/features/autocomplete` (suggestion anchoring).
- New runtime dependency: `react-native-key-command`, for hardware-keyboard shortcuts (iOS `AppDelegate.swift` hookup via config plugin). No other new dependencies — hover and width-class detection use APIs already available in `react-native` (`Pressable`'s `onHoverIn`/`onHoverOut`, `useWindowDimensions`).
