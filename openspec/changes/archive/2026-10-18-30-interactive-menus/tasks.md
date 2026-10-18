## 1. Protocol

- [x] 1.1 Added `QuestionSchema`, `PermissionInteractionSchema` (question / plan) as optional `interaction` in `PermissionRequestInfoSchema`, `PlanDecisionSchema`, `PermissionAnswerSchema` and the `permission.answer` client message; protocol samples for both answer kinds and a request with a question (59 tests green)

## 2. Daemon

- [x] 2.1 `features/permissions/interaction.ts`: `parseInteraction(tool, input)` (defaults `kind` to `choice`, drops malformed input to `null`) and `answerDecision(info, answer, keepPlanningMessage)` (kind check, only asked questions, blank answers ignored); Vitest tests in `permissions.test.ts`
- [x] 2.2 Broker fills `interaction`, gains `answer(requestId, answer)` and rejects `respond` `allow` on interactive requests; `Decision` carries `updatedInput`, `mode` and `message`, and `buildHookOutput` emits `updatedInput`, `setMode` (destination `session`) and the custom deny message; `permission.answer` registered in `permissions/index.ts`. Tests: question answered with `updatedInput`, question declined, plan approved with `setMode`, keep planning with and without feedback
- [x] 2.3 Push uses `push.questionPending` / `push.planPending` and no category for interactive requests; `claudeCode.keepPlanning` added; daemon catalogs in en-US, pt-BR and es-ES (parity test green); push test checks the titles, the missing category and that the plan text never leaks

## 3. App

- [x] 3.1 `features/permissions/interaction.ts`: `toggleOption`, `setOther`, `answerFor`, `buildAnswers`, `isAnswerComplete` with Vitest tests (single choice, multiple choice plus "Other", blank text)
- [x] 3.2 `QuestionCard` (radio/checkbox options, "Other" or answer field, numeric keyboard for `number`, Send enabled only when complete, Decline → `deny`) and `PlanCard` (plan in `Markdown` inside a 280 px scroll, approve accept edits / review edits, keep planning with optional feedback); `SessionPermissions` picks the card by `interaction.kind` and keys it by `requestId`; `useRespond()` gains `answer` sharing the `already_resolved` handling
- [x] 3.3 `permissions.question.*` and `permissions.plan.*` in pt-BR, en-US and es-ES (i18n parity tests green)

## 4. Verification

- [x] 4.1 `pnpm check` green (typecheck + 227 daemon, 59 protocol and 160 app tests + Biome) and `npx expo export --platform ios` bundles
- [ ] 4.2 Manual run against a real Claude Code session: answer an `AskUserQuestion` (single, multi, Other) and a plan approval from the phone, and confirm the card closes when answered in the terminal
