## MODIFIED Requirements

### Requirement: Header and machine line
The list screen header SHALL show the product mark (22 pt, accent) followed by "Sessions". On regular width (the sidebar header on wide screens) it SHALL keep both the new-session and settings actions on the right. On compact width (the stack header on phones) it SHALL show only the settings action; the new-session action instead appears as a floating action button over the list (see "New session floating action button"). Under the header a machine line SHALL show a connection dot (success when connected, danger when the token was rejected, warning otherwise), the machine name, the number of sessions in the list and, when at least one is known, the number of distinct agents.

#### Scenario: Connected
- **WHEN** the app is connected to "MacBook Pro" and the list shows 7 sessions, all Claude Code
- **THEN** the machine line reads "● MacBook Pro · 7 sessions" with "1 agent" on the right

#### Scenario: Compact header has no new-session icon
- **WHEN** the session list shows in compact width (phone)
- **THEN** its header shows only the settings action, and a floating action button opens a new session instead

#### Scenario: Regular width keeps the header action
- **WHEN** the session list shows as the sidebar on regular width (iPad, wide Split View)
- **THEN** its header keeps both the new-session and settings actions, and no floating action button is shown

## ADDED Requirements

### Requirement: New session floating action button
On compact width, a floating action button SHALL float over the bottom-right of the session list, inside the safe area, with an accessible label for "New session"; tapping it SHALL open the new-session screen and give the same selection haptic as the app's other primary actions. The list's bottom padding SHALL be large enough that the button never covers its last row. The Cmd+N keyboard shortcut SHALL keep opening the new-session screen independently of the button.

#### Scenario: Tapping the floating action button
- **WHEN** the user taps the floating action button on the compact session list
- **THEN** the new-session screen opens, the same as tapping the old header icon did

#### Scenario: Last row stays reachable
- **WHEN** the session list is scrolled to its end
- **THEN** the last row is fully visible above the floating action button, not covered by it
