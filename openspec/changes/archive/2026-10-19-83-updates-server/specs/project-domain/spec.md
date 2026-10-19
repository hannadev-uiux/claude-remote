## RENAMED Requirements

- FROM: `### Requirement: Updates proxy`
- TO: `### Requirement: Updates server`

## MODIFIED Requirements

### Requirement: Updates server
`https://remoteharness.app/api/updates/` SHALL be the Expo Updates server of the app, answered by the Worker from R2 as the `updates-server` capability describes, with no request forwarded to another site. The URL builds are made with (`https://remoteharness.app/api/updates/manifest`) MUST stay the same, since it is part of their runtime version.

#### Scenario: Manifest request
- **WHEN** a build made with `REMOTE_HARNESS_UPDATES_URL=https://remoteharness.app/api/updates/manifest` checks for updates
- **THEN** it receives the server's manifest for its runtime and channel

#### Scenario: No other site
- **WHEN** the app or the publisher talks to `/api/updates/*`
- **THEN** the Worker answers it without contacting `maarkn.dev` or any other origin
