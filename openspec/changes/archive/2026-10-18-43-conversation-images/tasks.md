## 1. Protocol

- [x] 1.1 `ImageRefSchema`, `MAX_TRANSCRIPT_IMAGE_BYTES`, `images` on `user`/`tool_result` entries, `transcript.image` client and server messages; tests

## 2. Daemon

- [x] 2.1 `parser.ts`: image refs for prompts and tool results (no `[imagem]`), `findImage`; fixture lines and tests
- [x] 2.2 `TranscriptService.image` and the `transcript.image` handler (sessions and subagents, `not_found`, `too_large`); tests

## 3. App

- [x] 3.1 Timeline carries images; tool JSON lists refs; pure `image-cache.ts` (size-capped LRU, 2-at-a-time queue, de-duplication) with tests
- [x] 3.2 `useTranscriptImage`, `TranscriptImagesContext`, `ImageStrip` (fixed-size thumbnails, loading/error/too large) under prompts and in tool calls
- [x] 3.3 `ImageViewer` (modal, pinch/pan/double tap, close, Android back); texts in en-US, pt-BR and es-ES

## 4. Verification

- [x] 4.1 `pnpm check` green (protocol 76, daemon 283, mobile 245 tests; Biome on the worktree), `npx expo export --platform ios` bundles; independent review findings fixed (lines swallowed by history/image reads, retry after reconnect and on tap, longer timeout for big images, viewer state on recycled cells, dropped fetches for unmounted thumbnails, numbering walk, tool images next to a result, prompt history, accessibility, theme colors, locale-aware sizes)
