## Context

`classifyUserString` in `apps/daemon/src/features/transcript/parser.ts` maps a user string to a slash command (`<command-name>`), its output (`<local-command-stdout>`), a skipped entry (`<command-message>`, `<system-reminder>`) or a user prompt. A survey of local transcripts (tag names and counts only) found, in user entries: `task-notification` (by far the most common; children `task-id`, `tool-use-id`, `output-file`, `status`, `summary`, `result`, `usage`, `note`, `worktree`; statuses `completed`, `failed`, `stopped`, `killed`), `bash-input`, `bash-stdout` + `bash-stderr` (always together), plus the already handled tags. The app's `SystemLine` shows `› text` for commands and `· text` for everything else.

## Goals / Non-Goals

**Goals:**
- No tagged notification is ever shown as something the user typed.
- Internal fields (ids, file paths, usage) never reach the app.
- New daemon with an old app degrades to plain system lines.

**Non-Goals:**
- Showing a background task's `result` (Claude reports on it in its next message, and it can be long).
- Changing how `<system-reminder>` entries are skipped.

## Decisions

- **System entries, not a new kind.** `TranscriptEntrySchema` is a discriminated union: a new `kind` would fail validation in apps that do not know it. The `system` entry gains optional `status`, `note` and `tag`. An old app strips them and shows `· <summary>` or `· <raw text>`.
- **Classification returns a list.** `classifyUserString` returns zero or more classified items, so one entry with several `<task-notification>` blocks gives one system entry each. Order: command, command output, skipped prefixes, task notifications, bash input, bash output, fully tagged fallback, user prompt.
- **Task notification fields.** `status` is the trimmed `<status>` (any value; the app translates the known ones and shows others as is), `text` is `<summary>` (falls back to the status when missing), `note` is `<note>` when present. Entities in the tag contents (`&lt;`, `&amp;`, …) are left as written.
- **Bash.** `bash_input` text is the trimmed command. `bash_output` text is stdout then stderr, each trimmed, joined with a newline; with both empty, no entry.
- **Fully tagged fallback.** `onlyTagsName` scans the string block by block: an opening tag (lowercase name with digits and dashes, optional attributes) and the first matching closing tag, then the next block, until only whitespace is left. A backtracking regex over repeated blocks could take exponential time on long input; the scan is linear. A string made only of such blocks is a `tagged` system entry with `tag` set to the first tag name and `text` the trimmed raw string. Plain prompts with some inline markup are not affected because the whole string must be tag blocks.
- **App rendering.** `timeline.ts` carries `status`, `note` and `tag` on system items. `TaskNotification`: an icon by status (`completed` check / success, `failed` X / danger, `stopped` and `killed` square / warning, other circle / muted), the translated status, the summary, and a chevron when there is a note, which expands below. `bash_input` renders like a command line with `!` instead of `›`. `TaggedEntry` works like `UnknownEntry`: a dimmed `· <tag>` that expands to the raw text.
- **i18n.** `conversation.task.status.{completed,failed,stopped,killed}`, `conversation.task.label` (accessibility: "Background task") and `conversation.tagged` in the three catalogs.

## Risks / Trade-offs

- [A prompt the user typed as only tag blocks (e.g. pasted XML) is shown as a tagged entry] → it is still visible, expanded with one tap; rare in practice.
- [Claude Code renames the tags] → the fully tagged fallback still keeps them out of the prompts.
