## Context

`ConversationScreen` renders the timeline with FlashList 2.3 and `maintainVisibleContentPosition={{ startRenderingFromBottom: true, autoscrollToBottomThreshold: 0.2 }}`. In FlashList, `checkBounds` (run on scroll events) sets a sticky `pendingAutoscrollToBottom` flag when the offset is within 20 % of the window from the bottom; when data or the content height changes, the flag triggers `scrollToEnd`. With `scrollEventThrottle={100}` the flag can be stale for up to 100 ms after the user starts dragging up, and the content height changes often while a turn streams (tool results, new entries), so the user is pulled back. The screen also keeps an `atBottom` ref (distance < 80 pt) and an `unseen` flag set when `items.length` grows while not at the bottom, which also fires when older pages are prepended.

FlashList 2 enables visible content anchoring by default (the cause of #27 on the session list): when items are added above, the first visible item keeps its position. That is what we want when older pages load.

## Goals / Non-Goals

**Goals:** never pull the user down while they read; an explicit, remembered follow toggle; the "new messages" button only for new messages at the end; older pages without a jump.

**Non-Goals:** a floating follow button over the list (the menu item and the "new messages" button are enough); per-session follow settings; changing how older pages are requested.

## Decisions

- **Own the follow logic, drop `autoscrollToBottomThreshold`.** Without it FlashList never auto-scrolls; anchoring stays on, so appended content does not move the viewport. Keeping FlashList's autoscroll and toggling the threshold does not work: the sticky flag is not cleared when the threshold is removed and can still fire once.
- **Pure rules in `follow.ts`**, tested with Vitest:
  - `distanceFromEnd(event)` and `isAtEnd(distance)` (< 80 pt, the current value).
  - `shouldFollow({ follow, atEnd, scrolling, settling })`: `!scrolling && (settling || (follow && atEnd))`.
  - `newAtEnd(previousLastKey, lastKey)`: true when the last timeline key changed from a non-null value. Prepending older pages keeps the last key, so it does not count; a tool result attached to an existing item keeps the key too (it just grows the item, and following handles it).
- **`useFollowScroll` hook** owns the scroll bookkeeping (refs, not state, so scroll events do not re-render the list) and returns the ScrollView props, the "new messages" flag, `jumpToEnd` and `leaveEnd`. FlashList passes these props to its ScrollView unchanged.
- **User scrolling = drag or the fling after it.** `onScrollBeginDrag`/`onScrollEndDrag` track the drag; a `onMomentumScrollBegin` within 100 ms of the drag end marks a fling until `onMomentumScrollEnd` (programmatic scrolls on Android also emit momentum events, and must not pause following). On iOS the drag end is judged at `targetContentOffset`, where the fling will stop, so a quick flick up from the end is not seen as "still at the end". Content that grows while the user scrolls is only noted; when they stop at the end the list catches up (a drag released without a fling waits 100 ms for a possible fling first). A small drag with no new content is not snapped back. A tap that stops a fling sends no momentum end (Android cancels it; iOS skips the delegate call), so a fling with no scroll event for 250 ms is treated as over.
- **Fresh `atEnd`.** Scroll events (`scrollEventThrottle` 16) update it. New items below send no scroll event, so when the list does not follow and the last item changed, `onContentSizeChange` recomputes it from the last known offset and viewport height; otherwise a layout change could jump past unread messages. Older pages (same last item) are skipped: FlashList drops scroll events during its offset correction, so the known offset is stale then.
- **One scroll per frame.** Follow scrolls go through a single pending `requestAnimationFrame`, dropped if the user started scrolling meanwhile, and are not animated (an animated scroll emits intermediate positions farther than 80 pt from the end, which would stop following mid-stream).
- **Settling on open.** The list mounts empty and the first page arrives later; FlashList's autoscroll used to bring it to the end, and with `startRenderingFromBottom` FlashList first scrolls to the top of the last item. For 1 s after the first content the list follows regardless of the toggle and of `atEnd` (a tall last message ends fully in view), with one last scroll to the end when the window closes, unless the user scrolled.
- **Keyboard and layout.** When the list's height changes (`onLayout`: keyboard, rotation, banners) and the user was at the end, the list scrolls to the end whatever the toggle says.
- **"New messages" button.** Shown when `newAtEnd` and the list did not follow it. Hidden when the user reaches the end. Tapping it scrolls to the end with animation; positions short of the end are ignored (and the button is not shown again) until FlashList's `scrollToEnd` promise settles plus 400 ms (it may take several steps when the last item is not rendered), capped at 2 s, so content arriving during the jump keeps following when the toggle is on.
- **Reset per stream.** The screen can show another conversation without remounting (iPad detail pane), so the refs and the button reset when the stream key changes, in a layout effect (before the new conversation's first layout events) that also scrolls to the end when items are already loaded.
- **Older pages spinner** moves from the list header to an overlay: swapping the header's height shifted the content, because anchoring does not account for the header.
- **Toggle storage** mirrors the key bar: a Zustand store persisted with `expo-secure-store` under `remote-harness.follow-output` (`on`/`off`), restored at app start, default on. The menu item is enabled in read-only sessions (the main use case) and its label shows the action ("Stop following output" when on, "Follow output" when off).

## Risks / Trade-offs

- [`onContentSizeChange` fires often while streaming] → at most one scroll per frame, only when following.
- [A drag taken over by another gesture sends no drag end on Android] → following stays paused until the next drag; a touch-cancel handler cannot fix it, because React Native also cancels the JS touch whenever the native scroll view starts dragging.
- [Fling detection relies on event timing (100 ms)] → if a fling start is missed, the fling still updates `atEnd` through scroll events and the next content follows only if the user ended at the end.
- [Not verified on a device in this change] → the rules are unit-tested and the scroll handling was reviewed against FlashList 2.3.3 and RN 0.86 sources; the PR asks for a manual check on iOS and Android with a growing read-only session.
