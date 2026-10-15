## Context

Expo Go does not load `@react-native-firebase`; the app uses a development build from the start (`expo-dev-client`).

## Goals / Non-Goals

**Goals:** clear layers: `app/` (thin routes), `src/features/*` (screens, components and hooks per feature), `src/core/*` (connection, storage, theme, utilities), `src/ui/*` (design system components).

**Non-Goals:** Android, tablets, light theme.

## Decisions

- **Expo Router** (typed routes). Protected `(main)` group; `pair` outside it.
- **`DaemonClient`** (React-free class, in `src/core/connection`): state machine `idle → connecting → authenticating → open → reconnecting`, `request<T>(msg)` with `id` (nanoid) and timeout, `on(type, handler)`. Testable with Vitest and a fake WebSocket.
- **Zustand** for connection, session and transcript state (per-feature stores, with selectors). **TanStack Query** for one-off requests (`files.search`, `commands.list`). The currently recommended combination: Zustand for live state coming from the socket, Query for request/response.
- **Styling**: `StyleSheet` + typed tokens in `src/core/theme` (colors, spacing, typography). No styling library, to reduce build risk; centralized tokens keep things consistent.
- **Palette**: background `#0D0D0D`, surface `#161616`, border `#2A2A2A`, text `#E8E6E3`, secondary text `#8A8784`, accent `#D97757`, success `#7FB069`, error `#E06C75`, warning `#E5C07B`, info `#61AFEF`.
- **Icon**: custom SVG at `assets/icon/icon.svg` (the Claude asterisk/star in orange over a dark terminal window with `>_`) converted to a 1024 PNG with `sharp` in a `pnpm icons` script.
- **AppState**: reconnect immediately when returning to the foreground.

## Risks / Trade-offs

- [Metro + pnpm] → `node-linker=hoisted` and `metro.config.js` with the monorepo's `watchFolders`.
