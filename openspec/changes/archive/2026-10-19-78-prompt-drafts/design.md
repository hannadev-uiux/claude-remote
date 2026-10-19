## Context

`usePrompt(sessionId)` keeps `text` and `attachments` (`PreparedImage[]`: key, cache `uri`, `base64`, size) in `useState`, so both vanish when the session screen unmounts. A successful `send` clears exactly what was sent (`current === value ? '' : current`, attachments filtered by identity) and a failed one keeps everything. Small preferences are persisted with `expo-secure-store` (`prefs-store`, `machine-store`) and restored from the root layout. Photo copies are written by `expo-image-manipulator` to the app cache.

## Goals / Non-Goals

**Goals:**
- No typed text lost when leaving a session, switching sessions, backgrounding or being killed.
- Draft content stays on the phone, encrypted at rest, out of backups.
- Pure, tested logic for save / restore / clear / expire.

**Non-Goals:**
- Syncing drafts across devices or with the daemon.
- Drafts for the new-session screen or queued-prompt editing.
- Keeping the cursor position.

## Decisions

- **One in-memory store, the source of truth for the composer.** `useDraftsStore` holds `drafts: Record<sessionId, Draft>` with `{ text, images: PreparedImage[], updatedAt, imagesLost }`. `usePrompt` reads `text` / `attachments` from it and writes through `setDraftText` / `setDraftImages` (functional updates supported, same semantics as before), so switching screens is instant and needs no disk. An entry with empty text and no images is deleted (this is the manual "discard": clear the field).
- **Persistence.** A store subscription persists changed drafts with a 500 ms debounce, and flushes when the app goes to the background. Each draft is one SecureStore item `remote-harness.draft.<id>` (the id reduced to `[A-Za-z0-9._-]`) with `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`, so it is encrypted by the Keychain / Keystore and never restored on another device (Android backups are already off). An index item `remote-harness.drafts` lists the session ids. Persisted images are `{ uri, width, height }` only, never base64. Text is capped at the prompt limit (100 KB) on disk.
- **Restore.** `bindDrafts()` (root layout) reads the index and the items, drops expired ones, and rebuilds each photo from its file (`File.base64()`); a missing or unreadable file is dropped and the draft gets `imagesLost` = count. The composer shows `drafts.imagesLost` as its error line once, and `usePrompt` clears the flag when shown. Edits made before the restore finishes win over the restored draft.
- **Pruning (pure `pruneDrafts`).** A draft is removed when it is older than 7 days, or when the session is absent from a loaded session list and the draft was last edited more than one hour ago (a daemon restart briefly lists fewer sessions). It runs after restore and whenever the sessions store changes while `loaded`. Forgetting the machine calls `clearAllDrafts()` (store and SecureStore items).
- **List marker.** `draftSummary(draft)` collapses whitespace and cuts at 60 characters with `…`; with no text but photos it is the photo count. `SessionRow` shows (subscribed to its own draft, so typing does not re-render the list) a line `Draft: <preview>` in the accent text color with a pencil icon; the accessibility label reads the same.

## Risks / Trade-offs

- [SecureStore is slow for large values] → one item per session, written at most every 500 ms and only for drafts that changed; drafts are short in practice.
- [Photo copies live in the cache, which the OS may purge] → the text survives and the user is told the photos were lost, as the issue allows.
- [A draft for a session that ended and was resumed under a new id stays until it expires] → acceptable; 7 days cap.
