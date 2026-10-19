## ADDED Requirements

### Requirement: Links in the conversation
The conversation SHALL render markdown links and bare URLs (`http://`, `https://`, `mailto:`) as links in every kind of entry: assistant messages (including inline code and code blocks), user messages, thinking, system lines and the expanded tool call output, JSON and input fields. A tap on a link whose target uses `https`, `http` or `mailto` MUST open it with the system handler. A link with any other target (another scheme, or a file path used as a markdown link target) MUST NOT be opened: a tap opens the link menu instead. A long press on any link SHALL open a menu with "Open" (only for `https`, `http`, `mailto`), "Copy link" and "Share"; copying MUST give a brief confirmation. File paths such as `src/foo.ts:12` MUST NOT be detected as links, and trailing punctuation or an unmatched closing parenthesis after a bare URL MUST NOT be part of it. Text that contains no link stays selectable.

#### Scenario: Open a markdown link
- **WHEN** an assistant message contains `[the PR](https://github.com/o/r/pull/1)` and the user taps "the PR"
- **THEN** the system opens `https://github.com/o/r/pull/1`

#### Scenario: Bare URL in tool output
- **WHEN** an expanded `Bash` result contains `Deployed to https://app.example.dev.` and the user taps the URL
- **THEN** `https://app.example.dev` opens, without the final period

#### Scenario: Copy with a long press
- **WHEN** the user long-presses a link and picks "Copy link"
- **THEN** the URL is in the clipboard and the app confirms the copy

#### Scenario: Unsafe scheme
- **WHEN** an assistant message links to `file:///etc/hosts` and the user taps it
- **THEN** nothing is opened and the menu offers only "Copy link" and "Share"

#### Scenario: File path
- **WHEN** a message shows `src/foo.ts:12`
- **THEN** it is not rendered as a link
