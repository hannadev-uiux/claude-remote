## ADDED Requirements

### Requirement: Codex sessions in the conversation
For a Codex session the mode chip SHALL show the session's approval policy (`on-request`, `never`, …, or `—` when unknown) and MUST NOT open the mode picker; its accessibility label says it is the approval policy. `exec` tool calls SHALL be labeled `exec(<command>)` with Command and Folder fields; `apply_patch` calls SHALL be labeled with the changed files and show the patch as a diff (added and removed lines colored, file headers as context). The new-session screen MUST hide the worktree option for agents that cannot start in a worktree (Codex). All labels MUST be translated.

#### Scenario: Mode chip
- **WHEN** a Codex session with approval policy `on-request` is open
- **THEN** the chip reads `on-request` and tapping it does nothing

#### Scenario: Patch
- **WHEN** the conversation has an `apply_patch` call updating `src/app.css`
- **THEN** the card reads `apply_patch(app.css)` and its diff shows the `-` and `+` lines

#### Scenario: No worktree for Codex
- **WHEN** the user picks a Codex profile in New session
- **THEN** the worktree toggle is not shown
