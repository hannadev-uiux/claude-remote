# subagents Specification

## Purpose
Shows the subagents and background tasks of each session, nested under the parent session.

## Requirements

### Requirement: Subagent discovery
The daemon SHALL list the subagents of each session with `agentId`, `agentType`, `description`, `state` (`running` or `done`), `updatedAt`, `startedAt` (when the subagent was first seen: the transcript file's creation time when known, otherwise the discovery time; `null` when unknown) and `toolCount` (the tool uses in its transcript so far), based on the subagent transcript files and the `SubagentStop` hook, sending `subagent.updated` on every change. The tool count SHALL be kept incrementally, reading only what was appended to the transcript since the last change, and the transcript format MUST stay inside the transcript parser.

#### Scenario: Subagent started
- **WHEN** a new `agent-*.jsonl` appears in the session's subagents folder
- **THEN** clients receive `subagent.updated` with `state: "running"`, a `startedAt` and `toolCount: 0`

#### Scenario: Subagent finished
- **WHEN** `SubagentStop` arrives for the agent
- **THEN** clients receive `subagent.updated` with `state: "done"`, keeping `startedAt` and the final `toolCount`

#### Scenario: Tool uses counted
- **WHEN** the subagent transcript grows by lines that carry two tool uses
- **THEN** `toolCount` grows by 2 without the daemon reading the earlier lines again

### Requirement: Subagent transcript
`session.subscribe` with `agentId` SHALL stream the subagent transcript with the same rules as the main transcript.

#### Scenario: Open a subagent
- **WHEN** the user taps a subagent
- **THEN** they see the subagent conversation in read-only mode

### Requirement: Background tasks
The session SHALL expose `backgroundTasks` with the background tasks reported in the last `Stop`.

#### Scenario: Background command
- **WHEN** `Stop` reports a background task
- **THEN** the session appears in the list with a "background" badge and the task count

### Requirement: Nesting in the app
The app SHALL show subagents nested under the parent session in the session list, with their state. The session screen MUST NOT show a strip of subagents; instead, when the session has subagents, the More options menu SHALL offer **Subagents (N)**, or **Subagents (N · M running)** while any runs, and the menu button SHALL show an accent dot while any subagent runs. Selecting the item SHALL open a sheet listing the subagents sorted running first, each row with its label, a state pill, the elapsed time (live while running, the total once done, omitted when the start is unknown) and the tool count when above zero; tapping a row SHALL open that subagent's conversation.

#### Scenario: List
- **WHEN** the session has two running subagents
- **THEN** the session row shows "+2 subagents" and lists them nested

#### Scenario: Menu and sheet
- **WHEN** a session has five subagents, two of them running
- **THEN** the More options menu reads "Subagents (5 · 2 running)", the menu button has an accent dot, and selecting it opens the sheet with the running ones first

#### Scenario: No subagents
- **WHEN** a session has no subagents
- **THEN** the menu has no Subagents item and the button shows no dot
