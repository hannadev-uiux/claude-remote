## ADDED Requirements

### Requirement: Live status palette
`LiveStatusProps` SHALL accept an optional `palette` object with the hex colors `background`, `text`, `textMuted`, `accent`, `success` and `warning`, and `live.register` SHALL accept the same optional `palette`. Messages without it MUST keep parsing.

#### Scenario: Registration with a palette
- **WHEN** the app sends `live.register` with `palette.accent` "#E8A33D"
- **THEN** the message parses and the palette is available to the daemon

#### Scenario: Props without a palette
- **WHEN** a daemon sends `LiveStatusProps` without `palette`
- **THEN** the props parse with `palette` undefined
