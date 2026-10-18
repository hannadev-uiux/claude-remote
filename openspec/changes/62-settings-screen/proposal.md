# 62 · Settings: Machine, Appearance, Profiles, Notifications, App

## Why

Settings still reads as a list of daemon facts: a "Machine" card of label/value rows, profiles as colored dots with ids, separate cards for push, muted profiles and live status, and the app card at the end. #157 (epic #162) reorganizes it into the identity prototype: a Machine card with an editable name and one meta line, profile rows with the agent badge and details, one Notifications card with the per-phone push toggle, the live status toggle and the muted list, and an App card with the update controls and the help links.

## What Changes

- **Protocol / daemon**: `device.unregister { fcmToken }` makes the daemon forget a phone's token (the counterpart of `device.register`).
- **App**
  - **Machine**: connection pill; the name (the alias when set, else the hostname) with an Edit sheet that saves or clears the alias; one line `host:port · remote-harness <version> · protocol <n>`; `Forget this machine` inside the card.
  - **Appearance**: unchanged swatches.
  - **Profiles**: rows with the agent badge, the name in the profile color and `Claude Code · ~/.claude · alias personal`; tapping opens a details sheet (agent, alias, config dir, notifications toggle for the profile).
  - **Notifications**: `Push notifications` toggle, per phone ("Only this phone · never the conversation"); when on, the existing status (computer mode, phone permission, what is missing, test). Turning it off sends `device.unregister` and stops registering until it is on again. `Live status` toggle. `Muted` row with `N profiles · M sessions` opening a sheet with the per-profile switches and the muted sessions, each unmutable.
  - **Voice**: unchanged language card.
  - **App**: version, update and channel as before, plus `Documentation` and `Report a problem` links.
- Copy in pt-BR, en-US and es-ES.

## Impact

- `packages/protocol/src/client.ts`, `apps/daemon/src/features/push/index.ts`.
- `apps/mobile/src/features/settings/{SettingsScreen,MachineCard,ProfilesCard,NotificationsCard,AppUpdatesCard,summary}.ts(x)`, `features/push/{push-settings-store,use-push}.ts`, `app/(main)/settings.tsx`, `app/_layout.tsx`, locales; `features/push/PushCard.tsx` and `features/live-status/LiveStatusCard.tsx` are removed (their content moved into the Notifications card).
- Specs: `app-shell` (ADDED Settings screen), `app-pairing` (MODIFIED Forget daemon), `push-notifications` (MODIFIED Push visibility and test), `notification-mute` (MODIFIED Controls in the app), `protocol` (MODIFIED Message catalog).
