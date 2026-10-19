## 1. Link logic

- [x] 1.1 Pure `splitLinks`, `classifyLink`, `linkActions` and the `rh-path:` marker helpers in `features/conversation/links.ts` with Vitest tests (bare URLs, trailing `…`, trailing punctuation, parentheses, mailto, file paths not detected, schemes classified)

## 2. Rendering

- [x] 2.1 Link menu: `openLink`/`copyLink`/`shareLink`/`showLinkMenu` (iOS action sheet, Android store + `LinkSheet` mounted in `ConversationScreen`), copy confirmation (haptic, announcement, Android toast)
- [x] 2.2 `LinkText` and `LinkifiedText` components (selectable only without links)
- [x] 2.3 `Markdown.tsx`: tokenizer that tags path targets and renderer subclass (`link`, `linkImage`, `codespan`, `code`, `text`)
- [x] 2.4 Use `LinkifiedText` in `Messages.tsx` (user, thinking, system) and `ToolCallCard.tsx` (output, JSON, input fields)
- [x] 2.5 `conversation.link.*` strings in pt-BR, en-US and es-ES

## 3. Verification

- [x] 3.1 `pnpm check` green (mobile link tests: 14) and `npx expo export --platform ios` bundles; marked tokenizer tagging checked in Node (inline and reference links); taps and long presses still need a visual check on a device
