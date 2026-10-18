## Context

`SettingsScreen` renders the Machine card (rows: name, host, version, protocol), `AppearanceCard`, a Profiles card (dot, name, id), then the route's children (`PushCard`, `ProfileMuteCard`, `LiveStatusCard`, `VoiceLanguageCard`, `AppUpdatesCard`) and the Forget button. The machine alias store from #94 has no UI yet. Push registration (`usePush`) always registers the FCM token when permission is granted; there is no per-phone off switch and the daemon has no way to forget a token on request. The prototype `settings.html` fixes the sections and copy.

## Decisions

- **One Notifications card, three concerns.** Push (per-phone toggle plus the existing status and test), Live status (the existing setting) and Muted (counts, with a sheet holding the per-profile switches that `ProfileMuteCard` had and the muted sessions with Unmute). `PushCard` and `LiveStatusCard` are removed; their logic (`pushIssue`, `canTestPush`, `setLiveStatusEnabled`) is reused.
- **Per-phone push toggle is a device setting.** `usePushSettings` (SecureStore, on by default). `usePush` syncs on connect and on every change: on → the usual permission + `device.register`; off → `device.unregister` with the phone's token and no registration (token refreshes are ignored while off). The daemon removes the token from its registry, so the phone is not counted or targeted; the relay grant is untouched. Muting stays a daemon-side, per-profile/session setting.
- **Machine name = alias or hostname.** `useMachineName` already resolves it; the Edit sheet writes through `setMachineAlias` (empty clears). `machineMeta` (pure) builds `host:port · remote-harness <version> · protocol <n>`, leaving unknown parts out.
- **Profiles reuse the new-session helpers.** `profileAgent` / `profileDetail` (change 61) plus `alias <id>`; the details sheet is where the per-profile notifications switch lives, so the Profiles card stays a list.
- **App card keeps the update controls** and gains the Documentation (`remoteharness.app/docs`, #136) and Report a problem (GitHub issues, #69) links.
- The summary helpers (`machineMeta`, `mutedSummary`) are pure and tested; the cards are composition only.
