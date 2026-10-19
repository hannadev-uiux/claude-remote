## MODIFIED Requirements

### Requirement: Flat list with filter chips
The list SHALL show every session that matches the current filter in one flat list, ordered by the chosen sort: **Recent** (default; newest `updatedAt` first, regardless of state) or **By state** (waiting first, then running, idle and ended, newest first inside each state). The sort SHALL be a ghost chip at the end of the filter row ("Recent ▾" / "By state ▾") that toggles on tap and is remembered on the device. Above the list the app SHALL show filter chips: `all` and one chip per profile (only when there is more than one profile), then `active` and `ended`; the selected chip is filled with the accent. A search box SHALL still filter by title and folder.

#### Scenario: Profile chip
- **WHEN** the user taps the "Work" chip
- **THEN** only the sessions of the Work profile remain, with no group header

#### Scenario: Single profile
- **WHEN** the daemon lists one profile
- **THEN** no profile chips are shown, only `active` and `ended`

#### Scenario: Recency by default
- **WHEN** an idle session was updated after a waiting one
- **THEN** the idle session is listed first and the waiting one keeps its warning border below it

#### Scenario: Back to the state order
- **WHEN** the user taps the sort chip
- **THEN** the list reorders waiting first and the chip reads "By state ▾", also after relaunching the app

## ADDED Requirements

### Requirement: Relative time
Every session row and the recent-directories list SHALL show a compact relative time of the last activity: "now" under 45 seconds, then minutes ("2 min"), hours ("2 h"), "yesterday" for one day and days ("3 d"), translated.

#### Scenario: Yesterday
- **WHEN** a session's last activity was 26 hours ago
- **THEN** its row shows "yesterday" (pt-BR "ontem", es-ES "ayer")
