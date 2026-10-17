## Context

`session.input` pastes text into the pane with `tmux load-buffer` + `paste-buffer -p`. Claude Code treats an image file path in the prompt as an image to read (the same thing that happens when a file is dragged into the terminal). The daemon and Claude Code run on the same machine, so a file the daemon writes is readable by Claude Code. The WebSocket currently caps messages at 1 MB.

## Goals / Non-Goals

**Goals:**
- One or more photos (camera or library) with or without text.
- Validation of type and size on the daemon; files only inside the daemon's own directory.
- Clear, localized errors.

**Non-Goals:**
- Video, PDFs or arbitrary files.
- Chunked/resumable uploads: images are shrunk on the phone, so one message per image is enough.
- Showing the images back in the conversation (the transcript already shows what Claude received).

## Decisions

- **Upload first, then reference by id.** `attachment.upload` carries one image and returns an `attachmentId`; `session.input` lists ids. This keeps each WebSocket message bounded (one image) and lets `session.input` stay small and keep its 100 KB text check. Inline base64 inside `session.input` would make a prompt with four photos a single 25 MB message.
- **Limits.** 5 MB decoded per image (the Claude API image limit), at most 4 attachments per prompt, `maxPayload` 8 MB (5 MB in base64 is ~6.7 MB plus the envelope). Pre-auth messages are bounded by the same limit and the socket only listens on Tailscale or 127.0.0.1.
- **Type check.** `mimeType` must be `image/jpeg`, `image/png`, `image/webp` or `image/gif` (what Claude accepts) and the decoded bytes must start with that format's signature; otherwise `unsupported_media`. The extension comes from the validated type, never from the client.
- **Storage.** `~/.claude-remote/attachments/` created with `0700`, files `<uuid>.<ext>` with `0600`. The id is a server-generated UUID; the daemon keeps `id → { sessionId, path }` in memory and resolves only ids it issued for the same session (`not_found` otherwise), so a client never supplies a path. Files stay after the prompt (Claude may read them later in the turn) and are deleted after 24 h, on start and every hour.
- **Prompt format** (pure `buildPrompt(text, paths)`): the trimmed text, then each path on its own line; paths with spaces are escaped with a backslash, like a terminal drag-and-drop. The 100 KB limit applies to the final prompt.
- **App processing.** Every image is resized so its longest side is at most 1568 px (Claude's recommended maximum; larger images are downscaled by the API anyway) and saved as JPEG at 0.8 quality, which keeps photos well under 1 MB. Upload happens on Send, in order; any failure keeps the text and the chips so the user can retry.
- **Old daemons** answer `attachment.upload` with `unknown_type`; the app shows "update the daemon" instead of the raw message.

## Risks / Trade-offs

- [Claude Code changes how it detects image paths] → Paths stay in the prompt as plain text, so Claude can still open them with the Read tool.
- [Larger frames for everyone] → 8 MB is still bounded, and only an authenticated client can send more than one message.
- [Disk use] → JPEGs of ~0.5 MB, pruned after 24 h.
