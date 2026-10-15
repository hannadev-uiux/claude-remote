## MODIFIED Requirements

### Requirement: Prompt sending
The prompt field SHALL send `session.input` and clear the field after the `ack`; on error, it MUST keep the text and show the message. In a read-only session the field MUST be disabled. With a hardware keyboard connected, Enter SHALL insert a newline and Cmd+Enter SHALL trigger the send, without changing the on-screen send button's behavior.

#### Scenario: Successful send
- **WHEN** the user sends "continue"
- **THEN** the field is cleared and the prompt appears in the conversation once written to the transcript

#### Scenario: Send via hardware keyboard
- **WHEN** the user presses Cmd+Enter with a hardware keyboard connected
- **THEN** the app sends the prompt as if the send button had been tapped

#### Scenario: Newline via hardware keyboard
- **WHEN** the user presses only Enter with a hardware keyboard connected
- **THEN** the app inserts a newline in the field without sending

## ADDED Requirements

### Requirement: Reading width in wide panes
When the detail pane is wider than a comfortable reading width, the conversation content (text, thinking, tool calls and diffs) SHALL be centered in a max-width column, instead of stretching edge to edge.

#### Scenario: iPad full screen, landscape
- **WHEN** a session opens in the detail pane of an iPad in full-screen landscape
- **THEN** the conversation content is centered in a max-width column, with free space on the sides

#### Scenario: Narrow detail pane
- **WHEN** the detail pane is narrower than the max reading width (iPhone, or iPad in narrow Split View)
- **THEN** the content takes up the full available width, as it does today
