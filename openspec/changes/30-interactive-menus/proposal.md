## Why

When Claude Code asks a multiple-choice question (`AskUserQuestion`) or asks to approve a plan (`ExitPlanMode`), the app shows a generic permission card with raw JSON and Allow/Deny, which cannot answer the question or pick how to leave plan mode. The only real way to answer is the raw terminal or the computer (issue #53).

## What Changes

- The daemon recognizes `AskUserQuestion` and `ExitPlanMode` in the `PermissionRequest` hook it already holds open, and sends their structured content (`interaction`) in `permission.request`: the questions with their options, or the plan.
- New client message `permission.answer`: answers to the questions, or a plan decision (approve with "accept edits", approve with manual approval of edits, or keep planning with optional feedback). The daemon turns it into the hook output (`updatedInput.answers`, `updatedPermissions` `setMode`, or a deny with the feedback).
- The app shows a question card (single or multiple choice, free-text "Other", text and number questions) and a plan card in the conversation; answering on the computer closes them, as with other permission cards.
- The push for these requests says Claude is waiting for an answer or a plan review, without content and without the Allow/Deny actions.
- Generic TUI pickers (`/model`, `/resume`, `/config`) stay out of scope: Claude Code has no hook for them and the raw terminal already covers them.

## Capabilities

### New Capabilities

### Modified Capabilities
- `permission-approval`: interactive tool requests (questions and plan approval) with structured answers
- `app-permissions`: question card and plan approval card
- `push-notifications`: dedicated title for interactive requests, no Allow/Deny actions on them
- `protocol`: new `permission.answer` client message; optional `interaction` in `PermissionRequestInfo`

## Impact

- `packages/protocol`: `PermissionInteractionSchema`, `PermissionAnswerSchema`, `permission.answer`
- `apps/daemon/src/features/permissions`: `interaction.ts` (pure parsing and answer → decision), broker `answer()`, hook output with `updatedInput`/`setMode`/custom deny message
- `apps/daemon/src/features/push`: title and category for interactive requests; daemon i18n (`claudeCode.keepPlanning`, `push.questionPending`, `push.planPending`)
- `apps/mobile/src/features/permissions`: `QuestionCard`, `PlanCard`, pure helpers for selections, `useRespond().answer`; app i18n
- No new hook is installed: `PermissionRequest` already matches every tool
