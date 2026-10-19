## ADDED Requirements

### Requirement: Quick copy
The conversation SHALL let the user copy content with one tap, without blocking dialogs and without sending anything to the daemon. User and assistant messages MUST have a copy button that copies the whole message (the markdown source for assistant messages). Fenced code blocks MUST show a header with the language (when given) and a Copy button that copies the code. Inline code MUST copy on tap or long press, unless it contains a link; a text block containing inline code MUST copy its whole text on a long press outside the code. An expanded tool call MUST offer a Copy button on the Output tab (the raw result) and the JSON tab (the JSON), and one per Input field (such as the `Bash` command). Every copy MUST be confirmed briefly: the copy icon turns into a check, plus a haptic and an accessibility announcement; copies without an icon also show a short toast on Android. Text without anything tappable stays selectable. Labels SHALL be translated (pt-BR, en-US, es-ES).

#### Scenario: Copy an answer
- **WHEN** the user taps the copy button of an assistant message
- **THEN** its markdown source is in the clipboard and the icon briefly shows a check

#### Scenario: Copy a code block
- **WHEN** an assistant message has a ```` ```bash ```` block with `pnpm check` and the user taps Copy in its header
- **THEN** `pnpm check` is in the clipboard and the header shows "bash"

#### Scenario: Copy inline code
- **WHEN** the user taps `` `pnpm check` `` inside an assistant paragraph
- **THEN** `pnpm check` is in the clipboard and the app confirms the copy

#### Scenario: Copy a Bash command
- **WHEN** the user opens the Input tab of a `Bash` call and taps the copy button of the Command field
- **THEN** the command is in the clipboard

#### Scenario: Copy a tool output
- **WHEN** the user expands a finished tool call on the Output tab and taps Copy
- **THEN** the full raw result is in the clipboard, even when the tab shows it cut with "Show more"
