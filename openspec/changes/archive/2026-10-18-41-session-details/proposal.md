## Why

On a phone the session screen only fits a shortened folder (`shortPath(session.cwd)` on one line), so long paths are cut and there is no way to read the full one. Other useful facts about the session (profile alias and config dir, session id, tmux pane) are not shown anywhere (#36).

## What Changes

- The session title in the header becomes tappable (button role, localized label and hint) and opens a **Session details** sheet. Tapping the folder in the info row below the header opens the same sheet.
- The sheet lists, as label/value rows that wrap instead of being cut: full folder path, git branch and worktree root (when in git), profile name, alias and config dir, state, permission mode, access (controllable or read-only), tmux pane (when any), session id and last update.
- Folder, worktree root and session id have a **Copy** action (with brief "Copied" feedback); every value is also selectable.
- The sheet closes with Close, tapping outside and the Android back button.
- Texts in pt-BR, en-US and es-ES.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-conversation`: new requirement "Session details".

## Impact

- `apps/mobile`: `sessionDetails()` pure builder with tests (`src/features/sessions/details.ts`), `SessionDetailsSheet` component, tappable header title and folder in `session/[id]/index.tsx`, catalog keys in the three locales.
- New dependency `expo-clipboard` (installed with `npx expo install`). The runtime version uses the fingerprint policy, so this **needs a new app build**; older builds do not receive the update over the air.
- No protocol or daemon change: everything comes from the `Session` and `Profile` the app already has.
