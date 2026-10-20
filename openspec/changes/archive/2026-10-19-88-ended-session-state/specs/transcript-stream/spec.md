## MODIFIED Requirements

### Requirement: Tolerant normalization
The daemon SHALL convert each transcript line into zero or more normalized entries (`user`, `assistant_text`, `thinking`, `tool_use`, `tool_result`, `system`, `unknown`). Invalid lines or lines of an unknown type MUST NOT interrupt reading. User entries that Claude Code writes as XML-like tags MUST NOT become `user` entries: each `<task-notification>` SHALL become a `system` entry with subtype `task_notification`, the summary as text, its `status` and its optional `note`, without the task id, tool use id, output file, usage or result; `<bash-input>` SHALL become a `bash_input` system entry with the command, and `<bash-stdout>`/`<bash-stderr>` a `bash_output` system entry with both outputs (none when both are empty); any other entry made only of tag blocks SHALL become a `tagged` system entry with the first tag name in `tag` and the raw text. The `(no content)` placeholder Claude Code writes for an empty command output or an empty assistant reply MUST NOT become an entry.

#### Scenario: Corrupted line
- **WHEN** a `.jsonl` line is not valid JSON
- **THEN** it is ignored and the following lines keep being streamed

#### Scenario: Internal types
- **WHEN** the line is `file-history-snapshot`, `atis-latch` or `queue-operation`
- **THEN** no entry is sent to the app

#### Scenario: Empty thinking
- **WHEN** a `thinking` block comes without text
- **THEN** no entry is sent for it

#### Scenario: Task notification
- **WHEN** a user entry is a `<task-notification>` with status `stopped`, a summary, a note and an output file path
- **THEN** a `system` entry with subtype `task_notification`, status `stopped`, the summary and the note is sent, and the output file path is not

#### Scenario: Shell command
- **WHEN** the user runs `! git status` in Claude Code
- **THEN** a `bash_input` entry with `git status` and a `bash_output` entry with its output are sent instead of user entries

#### Scenario: Unknown tag
- **WHEN** a user entry is only `<new-thing>…</new-thing>`
- **THEN** a `tagged` system entry with tag `new-thing` is sent, not a `user` entry

#### Scenario: Empty command output
- **WHEN** the user runs `/exit` and Claude Code records the command output as `(no content)`
- **THEN** only the `/exit` command entry is sent, without a `(no content)` line
