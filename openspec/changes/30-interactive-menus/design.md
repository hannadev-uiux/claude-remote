## Context

`PermissionBroker` holds the `PermissionRequest` hook open while the phone decides; Claude Code shows its own dialog at the same time and closes the hook request when the user answers in the terminal (outcome `cancelled`). `AskUserQuestion` and `ExitPlanMode` both report `requiresUserInteraction()` and answer `checkPermissions` with `ask`, so they already reach this hook (checked in the Claude Code 2.1.301 bundle). There, a hook `allow` with `updatedInput` is validated and used as the tool input, and `AskUserQuestion.call` reads `answers` (question text → answer string, multi-select joined with `", "`) from it. The documented route for answering these tools is `PreToolUse`, but a `PreToolUse` hook runs before the dialog and would hide it in the terminal while the phone decides.

## Goals / Non-Goals

**Goals:**
- Answer `AskUserQuestion` (choice, multi-select, free text, `text` and `number` questions) and `ExitPlanMode` from the app.
- Keep the terminal dialog usable at the same time; the first answer wins.
- Push without content, and no one-tap Allow/Deny for these requests.

**Non-Goals:**
- Generic TUI pickers (`/model`, `/resume`, `/config`): no hook exists and screen scraping is fragile; the raw terminal stays the way to answer them.
- Plan editing from the phone, or offering `auto`/`bypassPermissions` when leaving plan mode.

## Decisions

- **Reuse `PermissionRequest`, not `PreToolUse`.** Nothing new is installed, the TUI dialog stays visible, and cancel-on-terminal-answer already works. If a future Claude Code version stops sending these tools to `PermissionRequest`, the app falls back to the terminal, as today.
- **`interaction` is an optional field of `PermissionRequestInfo`**, parsed by a pure `parseInteraction(tool, input)`. Malformed input yields `null`, and the request falls back to the generic card. Old apps ignore the field.
- **New `permission.answer` message** instead of overloading `permission.respond`: the answer is a union by `kind` (`question` with `answers`, `plan` with `decision` and optional `feedback`). The daemon checks the kind against the pending request (`bad_request` otherwise). `permission.respond` keeps working: `deny` declines the question or plan; `allow` on an interactive request is `bad_request`, because allowing it without answers would re-ask in the terminal.
- **Answer → hook output** (pure `answerDecision`):
  - question → `allow` with `updatedInput = { ...input, answers }`
  - plan approve → `allow` with `updatedPermissions: [{ type: 'setMode', mode, destination: 'session' }]`, where `mode` is `acceptEdits` or `default`
  - keep planning → `deny` with the feedback, or the localized `claudeCode.keepPlanning` text when there is none
- **Selections are joined in the app** (`buildAnswers`): the daemon receives final strings, so the wire format of `answers` lives in one place per side. Free text replaces "Other"; an unanswered question is omitted.
- **Push**: interactive requests use `push.questionPending` / `push.planPending` as the title and no category, so no Allow/Deny buttons are offered.

## Risks / Trade-offs

- [The hook route for these tools is not documented and may change] → It was verified against the installed bundle, malformed input falls back to the generic card, and a hook without a decision always leaves the terminal dialog working.
- [`setMode` on an `ExitPlanMode` allow may be overridden by Claude Code's own restore of the pre-plan mode] → The session still leaves plan mode; the app's mode selector can adjust the mode afterwards.
- [Long plans in a card] → The plan is shown in a scrollable, height-limited area.
