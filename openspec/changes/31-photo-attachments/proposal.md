## Why

From the phone, there is no way to show Claude a screenshot, a whiteboard photo or an error on another screen. Claude Code reads images from file paths in the prompt, so the app only needs to get the image onto the computer and mention its path (issue #39).

## What Changes

- New client message `attachment.upload { sessionId, mimeType, data }` (base64, one image per message) answered by the new server message `attachment.uploaded { attachmentId }`.
- `session.input` gains optional `attachmentIds` (up to 4); `text` may be empty when there is at least one attachment.
- New error code `unsupported_media`.
- Daemon: an `attachments` feature validates type (allowlist + magic bytes) and size (5 MB decoded), saves each image as `~/.claude-remote/attachments/<uuid>.<ext>` (dir `0700`, file `0600`), and prunes files older than 24 h. The prompt sent to tmux is the text followed by the image paths, one per line.
- WebSocket `maxPayload` grows from 1 MB to 8 MB to fit one image per message.
- App: attach button in the composer (camera or library, via `expo-image-picker`), images resized to at most 1568 px and re-encoded as JPEG (`expo-image-manipulator`), preview chips with remove, errors in the three languages.

## Capabilities

### New Capabilities

### Modified Capabilities
- `protocol`: new messages and error code.
- `session-input`: prompts with image attachments.
- `app-conversation`: attaching photos in the composer.

## Impact

- `packages/protocol` (client/server schemas, error code, samples).
- `apps/daemon`: new `features/attachments`, `features/input` builds the prompt with paths, `core/paths`, `transport/ws-server` payload limit.
- `apps/mobile`: new native modules `expo-image-picker` and `expo-image-manipulator` (needs a new development build; not deliverable by OTA), iOS photo library prompt, composer and `usePrompt`.
