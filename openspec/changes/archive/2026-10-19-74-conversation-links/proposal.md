## Why

Links in a session's conversation cannot be used (issue #88): tapping a URL does nothing, a long press does not offer to copy it, and bare URLs in user messages, tool output and system lines are not detected as links at all. Reading a PR, a docs page or a deploy URL that Claude printed means retyping it by hand.

## What Changes

- Markdown links (`[text](url)`) and bare URLs (autolinked by GFM) in assistant messages render as tappable links; bare URLs are also detected in user messages, thinking, system lines, tool output and tool input fields, and inside inline code and code blocks.
- **Tap** on a web link (`https`, `http`, `mailto`) opens it with the system handler. Any other target (another scheme, a relative or absolute file path used as a markdown link target) is not opened: a tap opens the link menu instead.
- **Long press** on a link opens a menu with **Open** (web links only), **Copy link** and **Share**. Copying gives a haptic and an accessibility announcement (plus a toast on Android).
- Local file paths shown by Claude (`src/foo.ts:12`) are not detected as web links; a markdown link whose target is a path copies the path as written.
- Text that contains links is not natively selectable (a selectable text swallows the taps on its links); text without links stays selectable as today.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-conversation`: links in the conversation open on tap and offer copy/share on long press.

## Impact

`apps/mobile` only: pure link detection and classification (`features/conversation/links.ts`) with Vitest tests, a custom `react-native-marked` renderer and tokenizer in `Markdown.tsx`, a `LinkifiedText` component used by `Messages.tsx` and `ToolCallCard.tsx`, the link menu (native action sheet on iOS, bottom sheet on Android) and `conversation.link.*` strings in pt-BR, en-US and es-ES. No new native dependency (`Linking`, `Share`, `expo-clipboard` and `expo-haptics` are already in the app), so the change ships over the air. No protocol or daemon change.
