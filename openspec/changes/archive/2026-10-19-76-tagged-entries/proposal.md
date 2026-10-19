## Why

Claude Code writes some notifications into the transcript as **user** entries wrapped in XML-like tags (issue #90). The parser only knows slash commands, their output and system reminders, so a `<task-notification>` (a background agent or task that finished, failed or was stopped) shows up in the app as a prompt the user never typed, raw tags and internal paths included. The same happens to `!` shell commands (`<bash-input>`, `<bash-stdout>`, `<bash-stderr>`) and to any tag Claude Code adds later.

## What Changes

- The parser turns each `<task-notification>` into a `system` entry with subtype `task_notification`: the summary as text, plus `status` (`completed`, `failed`, `stopped`, `killed`, …) and an optional `note`. The task id, tool use id, output file path, usage and result are not sent.
- `!` commands become `system` entries: `bash_input` (the command) and `bash_output` (stdout and stderr, joined; nothing when both are empty).
- Any other user entry made only of tag blocks (`<tag>…</tag>`) becomes a `system` entry with subtype `tagged`, the tag name in `tag` and the raw text, instead of a user prompt.
- The app renders a task notification as a compact card (status icon and color, translated status, summary; the note expands on tap), `bash_input` as `! command`, and a `tagged` entry as a dimmed, collapsed line naming the tag that expands to the raw text.
- These entries stop counting as prompts (prompt history).

## Capabilities

### New Capabilities

### Modified Capabilities
- `transcript-stream`: tagged user entries are normalized to system entries.
- `app-conversation`: task notifications, shell commands and tagged entries have their own rendering.

## Impact

- `packages/protocol`: optional `status`, `note` and `tag` on the `system` transcript entry. Older apps ignore the new fields and show the summary or raw text as a plain system line, never as a prompt; older daemons keep sending user entries.
- `apps/daemon`: `features/transcript/parser.ts` only, with Vitest tests on fixtures without real paths or names.
- `apps/mobile`: `timeline.ts`, `Messages.tsx` (`TaskNotification`, `TaggedEntry`) and `conversation.task.*` / `conversation.tagged` strings in pt-BR, en-US and es-ES. Ships over the air together with a daemon release.
