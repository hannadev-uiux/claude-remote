# subagents Specification

## Purpose
Shows the subagents and background tasks of each session, nested under the parent session.

## Requirements

### Requirement: Subagent discovery
The daemon SHALL list the subagents of each session with `agentId`, `agentType`, `state` (`running` or `done`) and `updatedAt`, based on the subagent transcript files and the `SubagentStop` hook, sending `subagent.updated` on every change.

#### Scenario: Subagent started
- **WHEN** a new `agent-<id>.jsonl` appears in the session folder
- **THEN** clients receive `subagent.updated` with `state: "running"`

#### Scenario: Subagent finished
- **WHEN** `SubagentStop` arrives for the agent
- **THEN** the state becomes `done`

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
The app SHALL show subagents nested under the parent session, with their state, and a subagents section on the session screen.

#### Scenario: List
- **WHEN** the session has two running subagents
- **THEN** the session row shows "2 subagents" and expands to list them
