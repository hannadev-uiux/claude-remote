## ADDED Requirements

### Requirement: Width class and orientation
The app SHALL compute the window's width class from the available dimensions: regular when the width is at least 680pt, compact below that. On iPad, the app SHALL allow portrait and landscape orientation; on iPhone, orientation MUST stay locked to portrait.

#### Scenario: iPad full screen, landscape
- **WHEN** the user rotates a full-screen iPad to landscape
- **THEN** the app stays usable and recomputes the width class to regular

#### Scenario: iPhone rotated
- **WHEN** the user rotates an iPhone sideways
- **THEN** the screen stays in portrait

#### Scenario: iPad in narrow Split View
- **WHEN** the iPad is in Split View with less than 680pt of available width
- **THEN** the computed width class is compact

### Requirement: Master-detail navigation
In regular width class, the app SHALL show the session list as a fixed pane and the active screen (conversation, new session, settings, terminal, subagent) as the detail pane, both visible at the same time. In compact class, the app SHALL keep the current stack navigation, one screen at a time.

#### Scenario: Open a session in regular width
- **WHEN** the user taps a session in the list with the app in regular width
- **THEN** the conversation opens in the detail pane and the list stays visible

#### Scenario: Shrink to compact width
- **WHEN** the user shrinks the app window below the regular-width threshold
- **THEN** the app goes back to stack navigation, showing the last open screen full-screen

#### Scenario: No session open
- **WHEN** the app opens in regular width with no session previously open
- **THEN** the detail pane shows an empty state inviting the user to pick or start a session

### Requirement: Pointer and hardware keyboard in the shell
With a pointer (trackpad or mouse) connected, list items and shell buttons SHALL show a hover state. With a hardware keyboard connected, the shell SHALL offer shortcuts for new session (Cmd+N), settings (Cmd+,) and closing the detail pane (Esc, outside a text field).

#### Scenario: Hover on a session item
- **WHEN** the pointer passes over a session list item
- **THEN** the item gets a visual hover highlight

#### Scenario: New session shortcut
- **WHEN** the user presses Cmd+N with a hardware keyboard connected
- **THEN** the new session screen opens

#### Scenario: Settings shortcut
- **WHEN** the user presses Cmd+, with a hardware keyboard connected
- **THEN** the settings screen opens

#### Scenario: Close the detail pane
- **WHEN** the user presses Esc with the detail pane open in regular width and focus outside a text field
- **THEN** the detail pane goes back to the empty state

### Requirement: Multitasking on iPad
The app SHALL stay functional at any Split View or Slide Over width on iPad, recomputing the width class and the navigation whenever the system resizes the app's window.

#### Scenario: Resize Split View
- **WHEN** the user drags the Split View divider and the width crosses the threshold between compact and regular
- **THEN** the app switches between stack and master-detail without losing the open session
