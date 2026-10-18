## Why

In a session that keeps producing output (for example a read-only session whose transcript is still growing), scrolling up to read older messages is hard: the list jumps back to the newest message (#38). The conversation relies on FlashList's `autoscrollToBottomThreshold`, which keeps a sticky "near the bottom" flag that is only refreshed on (throttled) scroll events, so content that arrives while the user starts scrolling up still pulls them down. There is also no way to stop following the output on purpose, and the "new messages" button shows up when older pages load, because it counts items instead of looking at the end of the list.

## What Changes

- The app decides when to follow the output instead of FlashList: new content scrolls the list to the end only when following is on, the user is at the end and is not dragging the list. Once the user scrolls away from the end, the position stays put and the "new messages" button appears.
- **Follow output** toggle in the session "More options" menu ("Stop following output" / "Follow output"), enabled in read-only sessions too. The choice is remembered on the device (on by default) and applies to every conversation, including subagents.
- The "new messages" button appears only when a new item arrives at the end and the list did not follow it; loading older pages no longer shows it. Tapping it scrolls to the end and, with following on, resumes following.
- Loading older pages keeps the viewport where it is (FlashList's visible content anchoring stays on).
- Opening a conversation still lands at the end, whatever the toggle says. When the keyboard opens while the user is at the end, the end stays in view.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-conversation`: "Scrolling and history" (follow rules, toggle, new messages button) and "Session options menu" (new toggle item).

## Impact

- `apps/mobile`: pure follow rules with tests (`src/features/conversation/follow.ts`), `follow-store.ts` (SecureStore, restored at app start), `ConversationScreen` scroll handling, `sessionMenu` gains the toggle, catalog keys in the three locales.
- No protocol, daemon or native change: deliverable over the air.
