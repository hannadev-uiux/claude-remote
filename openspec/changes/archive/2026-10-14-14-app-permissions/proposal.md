## Why

Approving permissions and switching the mode from the phone unblocks sessions without going back to the Mac (A5, A11).

## What Changes

- Permission card pinned on the session screen (and an indicator in the list) with tool, command/file, countdown and the Allow, Always allow, Deny buttons.
- "Always allow" sheet showing the exact rule (editable) and the scope (profile/project) before confirming.
- Permission mode selector in the session header showing the confirmed mode; explicit confirmation when choosing `auto`.
- Haptic feedback.

## Capabilities

### New Capabilities
- `app-permissions`: responding to permission requests and switching mode in the app.

### Modified Capabilities

## Impact

`src/features/permissions`, `src/features/mode` in the app.
