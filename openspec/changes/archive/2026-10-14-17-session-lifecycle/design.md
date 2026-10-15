## Context

Launchers from change 04; registry from change 05.

## Decisions

- **Reuse the launcher** (`~/.claude-remote/bin/<profile>`) with the `CLAUDE_REMOTE_NO_ATTACH=1` variable so it does not try to attach a terminal.
- **Recent directories** derived from the session registry + a scan of transcripts (`cwd` field), without decoding the folder name (ambiguous).
- **`cwd` validation**: it must exist, be a directory and be inside `HOME`.

## Risks / Trade-offs

- [Opening an arbitrary remote shell] → only the fixed launcher is executed; `cwd` is validated.
