## ADDED Requirements

### Requirement: Subagent names
The daemon SHALL send `description` and `agentType` only as trimmed, non-empty strings (else `null`). While either is missing, it SHALL read the subagent's meta file again on later activity. Without a description, it SHALL use the first line of the subagent's prompt (the first user message of its transcript), cut at 80 characters. The app SHALL label a subagent with the first trimmed, non-empty value of: description, agent type, "Subagent #N" (its position by start time in the session), and MUST NOT show an empty label. With a description, the agent type SHALL be shown on the row's secondary line.

#### Scenario: Meta file written late
- **WHEN** a subagent's transcript appears before its meta file, and the meta file is written later with the description "Review the diff"
- **THEN** the subagent's label becomes "Review the diff" on its next activity

#### Scenario: No description anywhere
- **WHEN** a subagent has no meta file and an empty prompt
- **THEN** the app labels it "Subagent #2" when it was the second one to start

### Requirement: Subagent outcome and badges
A subagent that ended SHALL carry `outcome: "failed"` when the parent's `Agent`/`Task` tool result for it is an error, or its background task notification has status `failed`, and `outcome: "stopped"` when that status is `killed` or `cancelled`. The daemon SHALL look for it in the tail of the parent transcript after `SubagentStop`, more than once, because the result is written after the subagent stops. `state` SHALL stay `running` or `done`. The app SHALL show the state with text and a symbol, in theme colors that work in every theme:
- running: accent, with a dot;
- "✓ done": success;
- "× failed": danger;
- "■ stopped": warning.

The badges SHALL appear in the Subagents sheet, the tablet inspector and the nested rows of the session list. All labels MUST be translated.

#### Scenario: Failed subagent
- **WHEN** the parent's tool result for a subagent is an error
- **THEN** the subagent ends with `outcome: "failed"` and the app shows the red "× failed" badge

#### Scenario: Killed background subagent
- **WHEN** the task notification of a background subagent reports `<status>killed</status>`
- **THEN** the app shows the amber "■ stopped" badge
