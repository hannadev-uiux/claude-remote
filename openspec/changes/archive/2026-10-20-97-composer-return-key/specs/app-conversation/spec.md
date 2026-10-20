## MODIFIED Requirements

### Requirement: Keyboard hints
A hardware keyboard is in use while the composer is focused and the keyboard on screen is shorter than a software one, on any iOS device and on Android tablets. While it is, Return in the composer SHALL send the prompt (queued while the session is busy) instead of inserting a newline, Shift+Return SHALL insert a newline at the cursor (iOS and iPadOS), and ⌘⏎ keeps sending now. The composer SHALL show a hints row under the field: on tablets `⏎ queue`, `⌘⏎ send now`, `⇧⏎ new line` (iOS and iPadOS), `⌘1–9 session`, `⌘K search`, `⌘T terminal`, `⌘. esc`, `⌘⇧M mode`, `⌘/ shortcuts` and, while a tool permission waits in the session, `⌘A / ⌘D answer`; on phones the short row `⏎ queue`, `⇧⏎ new line` (iOS), `⌘⏎ send now`, `⌘/ shortcuts`.

With a software keyboard no hints row is shown and Return inserts a newline, unless the device's **Return key sends** setting (off by default) is on: then the software keyboard's return key is labeled Send and sends the prompt the same way. All labels MUST be translated.

#### Scenario: Hardware keyboard on iPad
- **WHEN** the composer is focused on an iPad with a hardware keyboard and the session is working
- **THEN** the hints row is visible, ends with `⌘/ shortcuts`, and pressing Return queues the typed prompt

#### Scenario: Hardware keyboard on iPhone
- **WHEN** the composer is focused on an iPhone with a hardware keyboard and the session is idle
- **THEN** the short hints row is visible and pressing Return sends the typed prompt

#### Scenario: New line from the hardware keyboard
- **WHEN** Return sends and the user types "a", presses Shift+Return and types "b"
- **THEN** the field holds "a", a newline and "b", and nothing was sent

#### Scenario: Software keyboard
- **WHEN** the software keyboard is up and "Return key sends" is off
- **THEN** no hints row is shown and Return inserts a newline

#### Scenario: Return key sends
- **WHEN** "Return key sends" is on and the user taps the software keyboard's Send key with text typed
- **THEN** the prompt is sent (or queued while the session is busy)

#### Scenario: Pending permission
- **WHEN** a tool permission is pending while the tablet hints row is visible
- **THEN** the row also shows `⌘A / ⌘D answer`
