## MODIFIED Requirements

### Requirement: Notifications and tagged entries
The conversation SHALL render a `task_notification` system entry as a compact card with an icon and color by status (completed, failed, stopped or killed, other), the translated status and the summary; when the entry has a note, a tap MUST expand it. A `bash_input` entry SHALL render as `! <command>`, and its `bash_output` as a system line. A `tagged` entry SHALL render as a dimmed, collapsed line naming the tag that expands to the raw text on tap. A `compact_summary` entry SHALL render as a collapsed card labeled as a compaction summary, right after the "Conversation compacted" line; tapping it MUST expand the full text rendered as markdown, scrollable, with the existing copy action, and collapse it again on a second tap. The "Conversation compacted" line (the `compact_boundary` entry) SHALL include the compaction trigger as a qualifier (e.g. "automatically", "manually") when the entry carries one, and SHALL fall back to the plain "Conversation compacted" text when it does not. None of these entries is shown as a user prompt or offered in the prompt history. Labels SHALL be translated (pt-BR, en-US, es-ES).

#### Scenario: Stopped background agent
- **WHEN** a `task_notification` entry arrives with status `stopped`, summary "Background agent didn't finish" and a note
- **THEN** the conversation shows a card with the stopped icon, "stopped" and the summary, and tapping it shows the note

#### Scenario: Unknown tag
- **WHEN** a `tagged` entry with tag `new-thing` arrives
- **THEN** a dimmed "new-thing" line appears that shows the raw text when tapped

#### Scenario: Compaction summary card
- **WHEN** a `compact_summary` entry arrives right after a `compact_boundary` entry
- **THEN** a collapsed "Conversation compacted" line appears followed by a collapsed summary card, and tapping the card renders its text as markdown with a copy action

#### Scenario: Compaction trigger known
- **WHEN** a `compact_boundary` entry arrives with `trigger: "auto"`
- **THEN** the "Conversation compacted" line names it as automatic

#### Scenario: Compaction trigger unknown
- **WHEN** a `compact_boundary` entry arrives without a `trigger` field
- **THEN** the line reads the plain "Conversation compacted" text, with no qualifier
