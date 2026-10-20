## 1. Navigation

- [x] 1.1 `features/sessions/session-navigation.ts`: pure `openSessionMode` (tests); `open-session.ts`: current path tracking and `openSession`.
- [x] 1.2 `(main)/_layout.tsx`: `unstable_settings.anchor = 'index'`, no back button on the list, ☰ only on the list and the conversation, path tracking.
- [x] 1.3 Callers use `openSession`: `SessionRow`, `SessionsScreen` (Enter, resume), `WaitingStrip`, `use-push`, `use-session-shortcuts`; ⌘F uses `dismissTo('/')`.

## 2. Validation

- [x] 2.1 `pnpm check` green and `npx expo export --platform ios` bundles.
