## Why

Text typed in a session's composer is lost when the user leaves the session screen (back to the list, another session) or when the OS kills the app in the background (issue #105). The prompt lives only in the screen's component state, so it disappears with the screen. Messaging apps keep a draft per conversation; Remote Harness should too.

## What Changes

- **Drafts per session**: the composer text and its attached photos are kept per session in an app store while typing, and persisted on the device (debounced). Opening the session again, returning to the foreground or relaunching the app restores them.
- A successful send clears the draft; a failed send keeps it (as today). Clearing the field (and removing the photos) discards the draft.
- Photos are kept as references to their local copies; when a copy no longer exists after a relaunch, the text is restored and the composer says the photos could not be restored.
- The session list shows a `Draft:` line with the start of the text on rows that have a draft.
- Drafts expire after 7 days, are removed when their session has been gone from the daemon's list for a while, and are all cleared when the machine is forgotten.
- Drafts never leave the phone: not sent to the daemon, not in push payloads; stored in the OS secure store (Keychain / Keystore), device-only.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-conversation`: new requirement Prompt drafts.
- `app-session-list`: new requirement Draft marker.

## Impact

`apps/mobile` only: new `src/features/drafts/` (pure logic with Vitest tests, Zustand store, SecureStore persistence), `usePrompt` reads and writes the draft store, `SessionRow` / `SessionsScreen` show the marker, `MachineCard` clears drafts on forget, root layout restores them at start; `drafts.*` labels in pt-BR, en-US and es-ES. No protocol or daemon change; ships over the air.
