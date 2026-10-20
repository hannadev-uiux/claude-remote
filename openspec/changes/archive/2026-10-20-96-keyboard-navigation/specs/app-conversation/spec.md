## MODIFIED Requirements

### Requirement: Keyboard hints
While a hardware keyboard is attached on a tablet (the composer is focused and the keyboard on screen is shorter than a software one), the composer SHALL show a hints row under the field with `⏎ queue`, `⌘⏎ send now`, `⌘1–9 session`, `⌘K search`, `⌘T terminal`, `⌘. esc`, `⌘⇧M mode`, `⌘/ shortcuts` and, while a tool permission waits in the session, `⌘A / ⌘D answer`; under the same condition Return in the composer SHALL send the prompt (queued while the session is busy) instead of inserting a newline. On phones and with a software keyboard nothing changes. All labels MUST be translated.

#### Scenario: Hardware keyboard on iPad
- **WHEN** the composer is focused on an iPad with a hardware keyboard and the session is working
- **THEN** the hints row is visible, ends with `⌘/ shortcuts`, and pressing Return queues the typed prompt

#### Scenario: Software keyboard
- **WHEN** the software keyboard is up
- **THEN** no hints row is shown and Return inserts a newline

#### Scenario: Pending permission
- **WHEN** a tool permission is pending while the hints row is visible
- **THEN** the row also shows `⌘A / ⌘D answer`
