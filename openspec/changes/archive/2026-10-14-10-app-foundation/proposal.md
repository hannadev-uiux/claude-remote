## Why

The app needs a solid foundation before the screens: navigation, visual theme, a resilient WebSocket client and an icon (A6).

## What Changes

- Expo app (current SDK, iOS development build) in `apps/mobile` with strict TypeScript and Expo Router.
- Dark theme inspired by the Claude Code terminal: near-black background, light text, Claude orange (`#D97757`) as the accent color, monospaced font (JetBrains Mono).
- App icon: the Claude Code symbol over a terminal with the `>_` prompt in the background, drawn in SVG and exported to PNG (icon and splash).
- WebSocket client with authentication, a request queue keyed by `id`, reconnection with exponential backoff and resubscription with a cursor.
- Global state with Zustand and request caching with TanStack Query.
- Feature-based structure.

## Capabilities

### New Capabilities
- `app-shell`: app foundation (theme, navigation, resilient connection to the daemon).

### Modified Capabilities

## Impact

New app `apps/mobile`. Dependencies: `expo`, `expo-router`, `zustand`, `@tanstack/react-query`, `@shopify/flash-list`, `@expo-google-fonts/jetbrains-mono`, `lucide-react-native`, `react-native-svg`, `expo-haptics`.
