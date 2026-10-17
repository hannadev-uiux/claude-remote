## 1. Protocol

- [x] 1.1 `attachment.upload` client message, `attachment.uploaded` server message, `attachmentIds` and empty `text` in `session.input`, `unsupported_media` error code, `ATTACHMENT_MIME_TYPES` / `MAX_ATTACHMENTS` / `MAX_ATTACHMENT_BYTES` constants; samples and schema tests (64 tests green)

## 2. Daemon

- [x] 2.1 `features/attachments`: pure `detectImageType`, `buildPrompt`/`escapePath` (in `features/input/prompt.ts`), with Vitest tests
- [x] 2.2 `AttachmentStore` (save with validation, resolve per session, prune > 24 h on start and hourly, `0700`/`0600`) and `attachment.upload` handler; `paths.attachments()`; transport test sends a 2 MB frame
- [x] 2.3 `InputService.sendText` resolves `attachmentIds` and pastes the built prompt; empty prompt → `bad_request`; WebSocket `maxPayload` 8 MB; tests

## 3. App

- [x] 3.1 `npx expo install expo-image-picker expo-image-manipulator`; plugin config and iOS photo library prompt in the three languages
- [x] 3.2 `features/attachments`: pure helpers (`fitWithin`, limits) with tests, `useAttachments` hook (camera/library, resize, JPEG, base64), `AttachmentChips`
- [x] 3.3 Composer attach button (camera or library), chips, Send enabled with attachments only; `usePrompt` uploads then sends; error texts in pt-BR, en-US and es-ES

## 4. Verification

- [x] 4.1 `pnpm check` green (daemon 250, mobile 166 tests) and `npx expo export --platform ios` bundles
