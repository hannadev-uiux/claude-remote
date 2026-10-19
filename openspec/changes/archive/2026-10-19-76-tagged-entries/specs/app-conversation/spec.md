## ADDED Requirements

### Requirement: Notifications and tagged entries
The conversation SHALL render a `task_notification` system entry as a compact card with an icon and color by status (completed, failed, stopped or killed, other), the translated status and the summary; when the entry has a note, a tap MUST expand it. A `bash_input` entry SHALL render as `! <command>`, and its `bash_output` as a system line. A `tagged` entry SHALL render as a dimmed, collapsed line naming the tag that expands to the raw text on tap. None of them is shown as a user prompt or offered in the prompt history. Labels SHALL be translated (pt-BR, en-US, es-ES).

#### Scenario: Stopped background agent
- **WHEN** a `task_notification` entry arrives with status `stopped`, summary "Background agent didn't finish" and a note
- **THEN** the conversation shows a card with the stopped icon, "stopped" and the summary, and tapping it shows the note

#### Scenario: Unknown tag
- **WHEN** a `tagged` entry with tag `new-thing` arrives
- **THEN** a dimmed "new-thing" line appears that shows the raw text when tapped
