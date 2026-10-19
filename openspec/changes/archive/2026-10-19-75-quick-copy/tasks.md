## 1. Copy logic

- [x] 1.1 Pure `toolTabCopyText`, `codeLabel` and `plainText` in `features/conversation/copy.ts` with Vitest tests

## 2. Rendering

- [x] 2.1 `copyText` effect and `useCopied` (haptic, announcement, Android toast) in `copy-text.ts`; link menu copy uses it
- [x] 2.2 `CopyButton` component; copy button on user and assistant messages
- [x] 2.3 `Markdown.tsx`: code block header with language and Copy; `CodeSpan` copying on tap/long press; block long press copies its text
- [x] 2.4 `ToolCallCard.tsx`: Copy on the Output and JSON tabs, per field on the Input tab
- [x] 2.5 `conversation.copy.*` strings in pt-BR, en-US and es-ES

## 3. Verification

- [x] 3.1 `pnpm check` green (copy tests: 4) and `npx expo export --platform ios` bundles; taps and feedback still need a visual check on a device
