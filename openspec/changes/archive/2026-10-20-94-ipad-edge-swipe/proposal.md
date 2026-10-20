## Why

On iPad in portrait (regular width, #159 / #180) the session list is an overlay sidebar opened only with the ☰ button. The usual iPad gesture, a swipe from the left edge, does nothing useful: on a session it is the stack's back gesture, and on the list it does nothing (#193).

## What Changes

- In overlay mode, a swipe from the left edge opens the sidebar, **following the finger**. On release it stays open past half its width or after a quick flick, otherwise it slides back.
- With the sidebar open, a swipe to the left on the dimmed area closes it, following the finger; a tap there still closes it. Swipes on the list itself stay with the rows (their swipe actions).
- The ☰ button, picking a session and the automatic open/close keep working; open and close now slide instead of appearing at once.
- **No conflict with the stack's back gesture:**
  - the edge zone exists only in overlay mode (never on phones), and only on the list and on a session's conversation, where ☰ already replaces the back button; the stack's own back swipe is turned off there in overlay mode;
  - deeper screens (terminal, subagent, settings) keep their back swipe and get no edge zone;
  - the zone is a thin strip below the header, so it never takes the ☰ tap, and only a rightward drag starts it.
- **Reduced motion:** the slide is instant (`ReduceMotion.System`), and the drag still follows the finger.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-shell`: Tablet layout: the overlay sidebar opens with an edge swipe and closes with a swipe or a tap outside.

## Impact

- `apps/mobile/src/core/layout/sidebar-drag.ts` (new, pure, tested): drag progress, release decision, where the edge swipe is enabled.
- `apps/mobile/src/ui/MasterDetailLayout.tsx`: animated overlay sidebar with the edge zone and the closing pan (RNGH + Reanimated).
- `apps/mobile/src/app/(main)/_layout.tsx`: passes `onOpenSidebar` and the edge-swipe flag; turns off the stack back gesture on the list and conversation in overlay mode.
- No new dependencies and no new texts: the gesture has no text, and the backdrop keeps its button role.
