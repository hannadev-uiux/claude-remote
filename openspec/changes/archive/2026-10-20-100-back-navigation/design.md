## Context

Expo Router 57 builds the `(main)` stack from the URL when a link opens the app. Without an anchor, `/session/<id>` becomes a one-screen stack. `router.navigate('/')` pushes `index` when it is not in the stack, while `router.dismissTo('/')` replaces the current screen in that case. On a portrait tablet, `(main)/_layout.tsx` passes `headerLeft: ☰` in the stack's `screenOptions`, which applies to every screen.

## Decisions

- **Anchor `index`** with `export const unstable_settings = { anchor: 'index' }`. It is the supported way in Expo Router 57 (`initialRouteName` is the older name) to keep a route under links into the stack.
- **No back on the list**: `headerBackVisible: false` on `index`. The list is the root of the app, so a "<" there is always wrong, even if a link stacks something unusual.
- **☰ per screen**: `headerLeft` is set in the options of `index` and `session/[id]/index` only. This matches the "Edge swipe for the tablet sidebar" requirement, under which only those two screens trade back for the sidebar.
- **One way to open a session**: `openSession(id)` reads the current path and calls pure `openSessionMode(pathname, id)`, which returns `stay`, `replace` or `push`. A small module keeps the current path, updated by the `(main)` layout. This avoids subscribing every list row to `usePathname`.
  - `stay`: that session's conversation is shown.
  - `replace`: another session's conversation (`/session/<other>`) is shown.
  - `push`: anything else, such as the list, a terminal or settings.

## Risks / Trade-offs

- [A notification tap while on another session's conversation now replaces it instead of stacking] → Back leads to the list, the same as switching sessions with ⌘↑/⌘↓. Deeper screens (terminal) still stack.
- [No device test] → Pure rules are tested. The router behavior relies on Expo Router 57's documented anchor and `dismissTo` semantics, checked in its source (`POP_TO` replaces when the route is missing).
