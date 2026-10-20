## 1. Logic

- [x] 1.1 `src/core/layout/sidebar-drag.ts`: `dragProgress`, `settlesOpen`, `edgeSwipeEnabled` (worklet-safe, no `react-native` import) with Vitest tests.

## 2. Layout

- [x] 2.1 `MasterDetailLayout`: animated overlay sidebar (shared progress, mounted while open/dragged/closing), edge strip with the open pan, backdrop with the close pan and tap; `onOpenSidebar` and `sidebarEdgeSwipe` props.
- [x] 2.2 `(main)/_layout.tsx`: pass `onOpenSidebar` and `edgeSwipeEnabled(…)`; `gestureEnabled: false` on `index` and `session/[id]/index` in overlay mode.

## 3. Validation

- [x] 3.1 `pnpm check` green and `npx expo export --platform ios` bundles.
