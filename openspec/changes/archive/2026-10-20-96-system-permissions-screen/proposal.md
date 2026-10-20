## Why

The app and the daemon depend on several system permissions (notifications, camera, photos, microphone, folder access, Keychain…), but there is no single place to see which are granted, denied or never asked. When something silently fails — no push, voice input not working, photos not attaching, the daemon unable to read a project folder — the user has to guess which permission is missing and where to fix it (issue #246).

## What Changes

- A new **Permissions** screen (Settings → Permissions) with two sections:
  - **On this phone**: Notifications, Camera, Photos (with "Limited" on iOS), Microphone + Speech recognition, and Local network (iOS only, heuristic) — each row has a status (Allowed / Denied / Not asked / Limited / Not available), why the app needs it, and an action (Allow to trigger the system prompt, or Open Settings when denied).
  - **On this computer**, fed by a new daemon message: Folder access (per recently-used project folder, plus Desktop/Documents/Downloads), Full Disk Access (heuristic), Accessibility/Automation (macOS, reliably checkable), Desktop notifications (status reported as "Not available" — see Non-goals), and Keychain access (derived from the existing token-store selection). Denied rows show how to fix it (System Settings path) and offer "Open on the computer".
- Protocol: a new `machine.permissions` client message, answered with `machine.permissions.results { permissions }` — a content-free status list (never folder contents).
- `remote-harness doctor` reuses the same pure status-classification functions to print a few more checks.
- Status mapping is pure, per-platform functions with Vitest tests (iOS/Android, macOS/Linux/WSL); a permission that doesn't exist on a platform reports "Not available" there, and Linux/WSL show only what applies (no TCC-style folder/Accessibility rows).
- All new labels through i18n (pt-BR, en-US, es-ES).

### Non-goals (explicitly out of scope for this change)
- **Desktop notification authorization status** cannot be queried without native code (no CLI or AppleScript exposes it): this change reports it as "Not available" with an explanation, offering only "Open Settings", never a fabricated Allow/Denied. Checking it for real would mean extending the Swift tray helper (`apps/daemon/tray/macos/Tray.swift`) with `UNUserNotificationCenter` — deferred to a follow-up change, since Swift changes can't be compiled or tested in this environment.
- **Live Activities (iOS) / the Android ongoing notification** and **Background refresh**: no reliable status query is available through the Expo SDK modules already in this project without adding a new native module, and the app does not use background fetch today. Left out rather than faked; the issue itself marks background refresh as conditional on actual use.
- Triggering the macOS notification permission *prompt* proactively (it only appears on the daemon's first `notify()` call) — out of scope; the screen only reports what it can observe.

## Capabilities

### New Capabilities
- `system-permissions`: the Permissions screen (phone + computer sections), the `machine.permissions` protocol message, the daemon's status checks, and the `doctor` integration. Named to avoid colliding with the existing `app-permissions` (tool-call permission cards) and `permission-approval` (tool-call request brokering) capabilities, which are about a session's tool-call approvals, not system/OS permissions.

### Modified Capabilities
- `app-shell`: the Settings screen gains a **Permissions** entry (between Notifications and Daemon) opening the new screen.

(the protocol's message catalog requirement only lists client/server message names; adding `machine.permissions`/`machine.openSettingsPane` is covered by the new `system-permissions` capability's own requirements rather than a delta to that enumeration, consistent with how other message-carrying capabilities like `push-notifications` document their own messages)

## Impact

- `packages/protocol/src/client.ts` (`machine.permissions` request), `packages/protocol/src/server.ts` (`machine.permissions.results` reply), `packages/protocol/src/domain.ts` (status/row schemas), tests.
- `apps/daemon/src/features/system-permissions/` (new: pure classifiers + the feature's `index.ts` wiring), `apps/daemon/src/infra/` (folder probes, the Accessibility osascript probe — process calls only), `apps/daemon/src/cli.ts` (`doctor` additions).
- `apps/mobile/src/features/system-permissions/` (new: pure phone-side status mappers + the screen and its rows), a new Settings entry point, i18n catalogs (pt-BR, en-US, es-ES).
