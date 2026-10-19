## 1. Protocol and daemon

- [x] 1.1 Optional `status`, `note` and `tag` on the `system` transcript entry in `@remote-harness/protocol`
- [x] 1.2 Parser: task notifications, bash input/output and the fully tagged fallback, with Vitest tests (redacted fixtures)

## 2. App

- [x] 2.1 `timeline.ts` carries `status`, `note` and `tag`; pure status-to-tone helper with tests
- [x] 2.2 `TaskNotification` card, `! command` line and `TaggedEntry` in `Messages.tsx`
- [x] 2.3 `conversation.task.*` and `conversation.tagged` strings in pt-BR, en-US and es-ES

## 3. Verification

- [x] 3.1 `pnpm check` green and `npx expo export --platform ios` bundles; the parser run over local transcripts leaves no tagged user entry (counts only); the cards still need a visual check on a device
