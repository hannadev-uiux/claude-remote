## ADDED Requirements

### Requirement: Composer action buttons
The composer SHALL show the attach and mic buttons, and no Send button, while the prompt has no text and no photos. With text, both MUST be replaced by Send. With photos and no text, it SHALL show the attach button and Send. While a voice recording is active or being transcribed, the mic MUST stay visible; while sending, Send MUST stay visible. A composer without attach or mic buttons always shows Send. The swap SHALL be animated subtly and without animation when the system requests reduced motion. Every button MUST have a touch target of at least 44 pt and a localized accessibility label.

#### Scenario: Empty field
- **WHEN** the prompt is empty
- **THEN** the composer shows the attach and mic buttons and no Send button

#### Scenario: Typing
- **WHEN** the user types "hi"
- **THEN** the attach and mic buttons are replaced by Send

#### Scenario: Photos only
- **WHEN** the user attached a photo and typed nothing
- **THEN** the composer shows the attach button and Send

#### Scenario: Recording
- **WHEN** a voice recording is in progress
- **THEN** the mic (stop) button stays visible
