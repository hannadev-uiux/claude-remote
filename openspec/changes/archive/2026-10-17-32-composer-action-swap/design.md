## Context

`PromptComposer` receives the attach and mic buttons as `ReactNode` slots (`attachButton`, `voiceButton`) from `SmartComposer`, which owns the picker and voice state. Send is always rendered and only toggles its enabled state.

## Goals / Non-Goals

**Goals:**
- Swap attach/mic and Send based on the prompt content, without losing the ability to stop a recording or add photos.
- Keep the decision in a pure, tested function.

**Non-Goals:**
- Press-and-hold to record (WhatsApp style): the mic keeps its tap-to-start / tap-to-stop behavior.

## Decisions

- **Pure selector** `composerActions({ hasText, hasAttachments, voiceActive, sending, hasAttach, hasVoice })` returns which of `attach`, `voice` and `send` to render:
  - `send` = sending, or text, or attachments, or no extra button available.
  - `voice` = available and (recording/transcribing, or nothing to send).
  - `attach` = available and no text (with photos only it stays, to add more).
- **Slots stay.** The issue suggests `onAttach`/`onRecord` props; the existing `ReactNode` slots already let the composer render nothing when a feature is missing, and the voice button carries its own state, so the composer only needs the `voiceActive` flag to apply the rules.
- **Animation**: Reanimated layout animations (`ZoomIn`/`ZoomOut` at 150 ms) with `ReduceMotion.System`, so the swap is instant when the user enabled reduced motion.
- **Touch target**: Send keeps its 36 px circle and gains `hitSlop` 6 (48 px), like `IconButton` (32 px + 8).

## Risks / Trade-offs

- [Send not visible when the field is empty may confuse at first] → It matches the messaging apps the issue references, and Cmd+Enter keeps working.
