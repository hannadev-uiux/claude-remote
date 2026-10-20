## Context

`MasterDetailLayout` renders the overlay sidebar only while `sidebarOpen` is true: a `Pressable` backdrop and an absolutely positioned `SafeAreaView` 340 wide, with no animation. `(main)/_layout.tsx` owns `sidebarOpen`, sets ☰ as `headerLeft` of every detail screen in overlay mode, opens the list on `/` and closes it when a session is picked. Sessions are pushed onto the detail stack, so the native stack's back swipe is active on a session. Session rows are `ReanimatedSwipeable` with actions on both sides. The app already uses RNGH `Gesture` + Reanimated + `scheduleOnRN` (image viewer).

## Goals / Non-Goals

**Goals:**
- Edge swipe opens the overlay list following the finger; swipe left or a tap outside closes it.
- No conflict with the stack back gesture on phones or deeper screens, nor with horizontal scrolling or row swipes.
- Reduced motion respected.

**Non-Goals:**
- Swiping the inline sidebar (landscape / wide) in or out.
- An edge gesture for the inspector side sheet.

## Decisions

- **One shared progress value (0 hidden → 1 open)** drives the sidebar's `translateX` (`(progress − 1) × 340`) and the backdrop's opacity. The `open` prop animates it with `withTiming(…, { reduceMotion: ReduceMotion.System })`; drags set it directly. The sidebar stays mounted while it is open, dragged or closing, and unmounts when the close animation ends, so the closed list costs nothing.
- **Release rule (pure, tested):**
  - a flick faster than 500 pt/s decides the direction;
  - otherwise the sidebar stays open from half its width.
  - The open drag starts at 0 and the close drag at 1; progress is clamped to [0, 1].
- **Edge zone:** a 20 pt invisible strip at the left edge, from below the header (safe area top + 56 pt) to the bottom, with `activeOffsetX(12)`, `failOffsetX(-8)` and `failOffsetY(±16)`. Only a rightward horizontal drag activates it; a tap or a vertical scroll passes. It renders only when `edgeSwipeEnabled(mode, open, pathname)` holds: overlay mode, closed, and the route is `/` or `/session/<id>`.
- **Stack back gesture:** `gestureEnabled: false` on `index` and `session/[id]/index` while in overlay mode. There ☰ replaces the back button, and the edge swipe takes its place. Terminal, subagent, settings and report keep their back swipe, and no strip is rendered there.
- **Close gesture on the backdrop only.** Rows swipe in both directions, so a pan over the list would fight them. A leftward pan on the dimmed area (`activeOffsetX(-12)`) closes, following the finger; the `Pressable` inside keeps the tap and the accessibility action.

## Risks / Trade-offs

- [The strip covers the first 20 pt of the conversation] → a tap or a vertical scroll there still passes (the pan fails on vertical movement), and horizontal content rarely starts at the very edge.
- [No back swipe on a session in portrait iPad] → intentional: ☰ already replaced the back button there, and the list is what "back" showed.
