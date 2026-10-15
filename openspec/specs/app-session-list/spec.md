# app-session-list Specification

## Purpose
Shows in the app all sessions of the configured profiles, with real-time state, and leads to the session screen.

## Requirements

### Requirement: Grouping by profile
The list SHALL group sessions by profile, each group with the profile's name and color, sorted as follows: waiting first, then running, idle and ended, and by descending `updatedAt` within each state.

#### Scenario: Waiting session
- **WHEN** a session of the `drclaude` profile is waiting for permission
- **THEN** it appears at the top of the `drclaude` group with a "waiting" badge

### Requirement: Real-time updates
The list SHALL reflect `session.updated` and `session.removed` without reloading the screen.

#### Scenario: Session finishes
- **WHEN** a session goes from `running` to `idle`
- **THEN** the badge changes in the list without user action

### Requirement: Read-only
Sessions with `controllable: false` SHALL show a "read-only" badge.

#### Scenario: Session outside tmux
- **WHEN** the session has no pane
- **THEN** it appears with a "read-only" badge

### Requirement: Empty state
With no sessions, the screen SHALL show instructions to start one with `claudin` or `drclaude`.

#### Scenario: No sessions
- **WHEN** the snapshot is empty
- **THEN** the screen shows the launcher usage instructions

### Requirement: Shared checkout in the list
Each session row SHALL show the branch of its checkout next to the directory, and a live session that shares its checkout with other live sessions SHALL show a warning badge with how many.

#### Scenario: Two sessions in the same checkout
- **WHEN** two live sessions have the same `checkout.root`
- **THEN** both rows show the badge "shared checkout (1)"

#### Scenario: Ended session
- **WHEN** one of them ends
- **THEN** the badge disappears from the other
