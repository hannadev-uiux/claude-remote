## Context

`session/[id]/index.tsx` renders the title in `headerTitle` (one line, max 200 pt) and an info row below the header with the profile name, `shortPath(cwd)` (one line) and the state badge. The `Session` in `useSessionsStore` has `id`, `profileId`, `cwd`, `title`, `state`, `permissionMode`, `controllable`, `paneId`, `updatedAt` and `checkout`; the `Profile` from `hello.profiles` has `id` (the launcher alias), `name`, `configDir` and `color`. Sheets in the app (`PromptHistorySheet`, `AlwaysAllowSheet`) are a bottom `Modal` with a backdrop.

## Goals / Non-Goals

**Goals:** see and copy the full folder and the session id; see the profile, mode, access and pane; accessible and translated.

**Non-Goals:** the session start time and the transcript path (not in the `Session` today; adding them is a protocol change left for later); editing anything from the sheet; actions such as closing or renaming the session.

## Decisions

- **Pure row builder.** `sessionDetails(session, profile, t)` returns `{ key, label, value, copy }[]` in display order, skipping rows without data (no checkout, no pane, unknown profile). It holds the rules (which rows exist, labels, read-only text), so it is tested with Vitest without React Native. The component only renders rows.
- **Same sheet pattern as the others.** A bottom `Modal` (`animationType="slide"`, backdrop closes it). `onRequestClose` handles the Android back button, so no `useBackHandler` is needed. Content scrolls (`ScrollView`) for small screens with large text.
- **Values wrap and are selectable.** No `numberOfLines`; `selectable` on values lets the user copy part of a path natively. Paths and ids are shown in full (no `~` shortening) because the point is to see the exact path.
- **Copy with `expo-clipboard`.** React Native no longer ships a clipboard API. `setStringAsync` is Expo's own module. The row shows "Copied" for about 1.5 s after a successful copy; a failure leaves the label unchanged (the value is still selectable). The new native module changes the fingerprint, so it ships with the next build.
- **Tappable title.** `headerTitle` becomes a `Pressable` with `accessibilityRole="button"`, label "Session details: <title>" and a hint, plus a small chevron so it reads as tappable. The folder text in the info row is a `Pressable` that opens the same sheet. The sheet state lives in the route, next to the history sheet state.
- **Last update** shows the relative time already used in the list (`relativeTime`) followed by the local date and time (`toLocaleString` with the app language); if formatting throws, the ISO string is shown.

## Risks / Trade-offs

- [Needs a new build] → stated in the proposal and the PR; the fingerprint keeps old builds from getting an incompatible bundle.
- [Header title width on iOS 26] → the title keeps `numberOfLines={1}` and the max width; the chevron is small and inside the same max width.
