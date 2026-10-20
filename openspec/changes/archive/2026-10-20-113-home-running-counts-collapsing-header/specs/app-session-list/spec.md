## MODIFIED Requirements

### Requirement: Header and machine line
The list screen header SHALL show the product mark (22 pt, accent) followed by "Sessions". On regular width (the sidebar header on wide screens) it SHALL keep both the new-session and settings actions on the right. On compact width (the stack header on phones) it SHALL show only the settings action; the new-session action instead appears as a floating action button over the list (see "New session floating action button"). Under the header a machine line SHALL show a connection dot (success when connected, danger when the token was rejected, warning otherwise), the machine name, the number of sessions in the list, and — only the parts that are non-zero — the number running, the number waiting and the number of background tasks and running subagents across the list ("+N tasks"); on the right, when at least one agent is known, the number of distinct agents and, when any has a running session, how many. Tapping the running or the waiting count SHALL apply the `active` filter chip.

#### Scenario: Connected
- **WHEN** the app is connected to "MacBook Pro" and the list shows 7 sessions, 3 running, 1 waiting, all Claude Code
- **THEN** the machine line reads "● MacBook Pro · 7 sessions · 3 running · 1 waiting" with "1 agent · 1 running" on the right

#### Scenario: Nothing running or waiting
- **WHEN** every session in the list is idle or ended
- **THEN** the machine line shows the session count with no running or waiting part

#### Scenario: Tap the running count
- **WHEN** the user taps "3 running" in the machine line
- **THEN** the list applies the `active` filter chip, the same as tapping the "Active" chip

#### Scenario: Compact header has no new-session icon
- **WHEN** the session list shows in compact width (phone)
- **THEN** its header shows only the settings action, and a floating action button opens a new session instead

#### Scenario: Regular width keeps the header action
- **WHEN** the session list shows as the sidebar on regular width (iPad, wide Split View)
- **THEN** its header keeps both the new-session and settings actions, and no floating action button is shown

## ADDED Requirements

### Requirement: Collapsing header on scroll
On compact width, scrolling the session list down SHALL collapse the machine line and the filter chip row into a compact bar — a small mark glyph, the search field and a filters button that shows a dot when a filter is active (`isFiltering`) — animated on the UI thread (`react-native-reanimated`) with no layout jump. Scrolling up by any amount, or the list being at its top, SHALL restore the full header. The animation SHALL be skipped (an immediate switch, no tween) when the OS "Reduce Motion" setting is on. The filters button SHALL open a sheet with the same filter chips as the full header's row (profile chips when there is more than one profile, Active, Ended, the sort chip), so every filter stays reachable from the compact bar. On regular width (the sidebar) the header SHALL NOT collapse; it always shows in full.

#### Scenario: Scroll down
- **WHEN** the user scrolls the session list down on a phone
- **THEN** the machine line and filter chips give way to a compact bar with the mark, the search field and the filters button

#### Scenario: Scroll up restores the header
- **WHEN** the user scrolls up, even slightly, while the compact bar shows
- **THEN** the full header (machine line and filter chips) reappears

#### Scenario: Reduce Motion
- **WHEN** the device has Reduce Motion on
- **THEN** the header switches between full and compact with no animated transition

#### Scenario: Filters from the compact bar
- **WHEN** the user taps the filters button while a profile filter is active
- **THEN** the button shows a dot and the sheet opens with that profile's chip selected, matching the full header

#### Scenario: Regular width never collapses
- **WHEN** the session list shows as the sidebar on regular width
- **THEN** the header stays fully expanded regardless of scroll position
