## Why

Some subagents show a blank label in the Subagents sheet and in the nested rows of the session list. The state badge is also the same small gray pill for every outcome, so a failed subagent looks like a finished one (issue #229).

Causes:

- **Blank names:** the app falls back from description to agent type with `??`, so an empty string shows as an empty row. The daemon reads the subagent's meta file once, when it first sees the subagent. If the meta file is not there yet, the subagent keeps no description and no type.
- **Same badge for every outcome:** the daemon maps every end to `done`.

## What Changes

- **Daemon, names:**
  - Blank descriptions and agent types become `null`.
  - The meta file is read again on later activity while the description or the type is missing.
  - When there is no description, the first line of the subagent's prompt is used. That is the first user message of its own transcript, cut at 80 characters.
- **Daemon, outcome:** a subagent that ended gets an optional `outcome`, `failed` or `stopped`, read from the parent session's transcript:
  - the result of the `Agent`/`Task` call that spawned it, marked as an error, means `failed`;
  - for a background subagent, the task notification with its id: status `failed` means `failed`, and `killed` or `cancelled` mean `stopped`.

  The daemon looks at the tail of the parent transcript a few times after `SubagentStop` (3 s, 15 s, 60 s), because the result is written after the subagent stops. `state` stays `running | done`, so older apps keep parsing sessions.
- **App:**
  - **Label:** fallback on trimmed, non-empty values: description → agent type → "Subagent #N" (by start order) → short id. With a description, the agent type is shown on the secondary line.
  - **Badges:** text and a symbol, not color alone:
    - running: accent, with the dot;
    - ✓ done: green;
    - × failed: red;
    - ■ stopped: amber.

    The same applies in the Subagents sheet and the tablet inspector, which share the rows, and in the nested rows of the session list.

## Capabilities

### New Capabilities

### Modified Capabilities
- `subagents`: names that are never blank, a failed or stopped outcome, and semantic state badges

## Impact

- `packages/protocol`: `SubagentInfo.outcome`
- `apps/daemon`:
  - `features/transcript/parser.ts` (`subagentOutcome`, `subagentPromptLine`, pure, tested);
  - `features/subagents/tracker.ts` (names, meta re-read, outcome checks).
- `apps/mobile/src/features/subagents`: `subagentLabel`, `subagentStatus` (pure, tested), rows and nested list; i18n
