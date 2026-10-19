## Context

Assistant text is rendered by `react-native-marked` (`useMarkdown` in `Markdown.tsx`). Its default renderer turns links into a nested `Text` with `onPress={Linking.openURL}`, but every text node it creates is `selectable`, and a selectable native text view handles the touches itself (selection / copy menu), so the nested link's press never reaches JS. The rest of the conversation (user messages, thinking, system lines, tool output and input) is plain `<Text selectable>`: nothing detects URLs there. `react-native-marked` exports its `Renderer` class and marked's `Tokenizer` (`MarkedTokenizer`), and `useMarkdown` accepts a custom `renderer` and `tokenizer`.

## Goals / Non-Goals

**Goals:**
- Tap opens web links; long press offers Open / Copy link / Share, in every kind of conversation entry.
- Only `https`, `http` and `mailto` open; anything else is copy/share only.
- File paths are never mistaken for web links.

**Non-Goals:**
- An in-app browser (`expo-web-browser` would be a new native module and need a new build; the system browser is enough).
- Opening file paths in an editor or on the Mac.
- Partial text selection in markdown (the native text views only offer copying the whole block today).

## Decisions

- **Pure detection and classification (`links.ts`).** `splitLinks(text)` returns `text`/`link` segments for bare `http://`, `https://` and `mailto:` URLs: the scheme must not follow a letter or digit, the URL stops at whitespace, `<`, `>`, `"` and backticks, trailing `.,:;!?'*_` are dropped, and a closing `)`, `]` or `}` is dropped when it has no opening pair inside the URL (so `(see https://x.dev/a)` and `https://en.wikipedia.org/wiki/Foo_(bar)` both work). `classifyLink(href)` returns `web` (`http`, `https`, `mailto`), `path` (a markdown target without a scheme, tagged by the tokenizer) or `other` (any other scheme, e.g. `file:`, `vscode:`). `linkActions(kind)` lists the menu actions (`open` only for `web`). All with Vitest tests, including "a path like `src/foo.ts:12` is not a link".
- **Markdown targets that are paths.** marked's `getValidURL` prefixes targets without a scheme with `/`, which makes `src/a.ts` and `/src/a.ts` indistinguishable. A `MarkedTokenizer` subclass rewrites the `href` of `link`/`reflink` tokens without a scheme to `rh-path:<target>` before the parser sees it (a scheme, so `getValidURL` keeps it), and `classifyLink` turns it back into `{ kind: 'path', value: target }`. Copy gives the target exactly as Claude wrote it.
- **Custom renderer.** A `Renderer` subclass overrides `link` and `linkImage` to render `LinkText`, `codespan` and `code` to linkify bare URLs inside code, and `text` so that a text block is `selectable` only when it contains no link (the root text view decides selectability; nested links inside a selectable root would not get their taps). The renderer is built once per theme, like the options today.
- **`LinkText` and `LinkifiedText`.** `LinkText` is a nested `Text` with the link color, underline, `accessibilityRole="link"`, `onPress` (open for `web`, menu otherwise) and `onLongPress` (menu). `LinkifiedText` takes a string and the usual `Text` props, renders `splitLinks` segments inside one `Text`, and keeps `selectable` only when the string has no link. `Messages.tsx` (user message, thinking, system line) and `ToolCallCard.tsx` (output, JSON, input fields) use it instead of `<Text selectable>`. The collapsed one-line preview of a tool call stays plain (it is a tap target that expands the card).
- **Opening.** `Linking.openURL` for `web` links; a failure is ignored (nothing else to do on a phone without a handler).
- **Menu.** iOS: `ActionSheetIOS` with the URL as the title, like `ActionMenu`. Android: a small store holds the link being shown and a `LinkSheet` bottom sheet (same look as the other sheets) mounted by `ConversationScreen` lists the actions. Copy uses `expo-clipboard`, then a success haptic, an accessibility announcement and, on Android, a short `ToastAndroid`. Share uses React Native's `Share.share` (`url` + `message` on iOS, `message` on Android).
- **i18n.** `conversation.link.open`, `.copy`, `.share`, `.copied` in the three catalogs.

## Risks / Trade-offs

- [Text with links loses native selection] → the long-press copy on the link covers the common need; text without links keeps today's behavior. The JSON tab of a tool call still shows the raw output when it has no link.
- [Heuristic URL end] → trailing punctuation rules can miss exotic URLs; the copy action gives the user the exact detected string, and markdown links with explicit targets are unaffected.
- [Device check] → taps and long presses need a visual check on a device; the logic behind them is unit tested.
