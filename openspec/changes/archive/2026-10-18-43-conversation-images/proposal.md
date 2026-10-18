## Why

Images in a session are not rendered (#42). The daemon's transcript parser turns every image block into the text `[imagem]`, which also breaks the i18n rule (a hardcoded Portuguese string). Images show up in prompts (pasted screenshots, photos sent from the app) and in tool results (Claude Code reading a PNG or taking a screenshot), and they are often what the conversation is about.

## What Changes

- **Protocol:** `user` and `tool_result` transcript entries gain `images: ImageRef[]` (`id`, `mediaType`, `bytes`; default empty, so older daemons and apps keep working). The image data is not in the entry: the app fetches it with a new `transcript.image` request (`sessionId`, optional `agentId`, `imageId`), answered with `transcript.image` (`imageId`, `mediaType`, base64 `data`). Images larger than 5 MB (the Claude API's own limit) are answered with `too_large`.
- **Daemon:** `parser.ts` extracts base64 image blocks from prompts and from tool result contents into image refs; the `[imagem]` placeholder is gone (an image-only prompt has empty text). A new handler reads the image's transcript line again and returns its data. Fixes a daemon bug this would have made frequent: reading a live transcript for a history page or an image could swallow lines its stream had not sent yet. Fixture and tests.
- **App:** thumbnails under user prompts and in tool calls (collapsed and in the Output tab), loaded lazily as they scroll into view with a placeholder of fixed size, a small in-memory cache, at most two fetches at a time (newest first, dropped when the thumbnail scrolls away before it starts), a retry after reconnecting and on tap. Tapping a thumbnail opens a full-screen viewer with pinch zoom, pan and double tap, closed with a button, a single tap while not zoomed or the Android back button. Error and too-large states are localized in pt-BR, en-US and es-ES.

## Capabilities

### New Capabilities

### Modified Capabilities
- `protocol`: image refs in transcript entries and the `transcript.image` messages.
- `transcript-stream`: image extraction and the image fetch.
- `app-conversation`: images in the conversation.

## Impact

- `packages/protocol`: `ImageRefSchema`, `MAX_TRANSCRIPT_IMAGE_BYTES`, `images` on `user`/`tool_result` entries, `transcript.image` client and server messages; tests.
- `apps/daemon`: `parser.ts` (refs, `findImage`), `TranscriptService.image`, `transcript.image` handler; fixture lines with images; tests.
- `apps/mobile`: `ImageStrip`, `ImageViewer`, `use-transcript-image` with a pure cache/queue module and tests; timeline carries images; texts in the three catalogs.
- No new native dependency (React Native `Image` with data URIs; gestures with the already installed Gesture Handler and Reanimated), so the app part ships over the air. The daemon must be updated for images to appear; older daemons send no refs. An older app talking to a newer daemon shows an image-only prompt as an empty prompt instead of `[imagem]`.
