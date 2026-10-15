## Context

`PermissionRequest` accepts `decision.updatedPermissions` with `addRules` and `destination` (`userSettings`, `localSettings` etc.), and carries `permission_suggestions`.

## Goals / Non-Goals

**Goals:** no decision made without the user; rules exactly as shown.

**Non-Goals:** editing `updatedInput`.

## Decisions

- **Writing via `updatedPermissions`**: `scope: profile` → `destination: "userSettings"` (Claude Code writes to the `settings.json` of the session's `CLAUDE_CONFIG_DIR`); `scope: project` → `"localSettings"`. This way the CLI itself applies the rule to the current session and persists it while preserving the file. The daemon records it in `rules-log.jsonl` (id, rule, scope, file, date). `rules undo` removes the rule by editing the file (read, filter, atomic write).
- **Suggested rule**: uses the first `addRules` suggestion from the payload; without a suggestion, generates `Tool(prefix:*)` for Bash (first word + subcommand) or `Tool` for the others.
- **Default scope**: `project` (the most restrictive), configurable in `config.json` (open question from the PRD resolved on the safe side).
- **Pending map** `requestId → { resolve, timer }`; default timeout 280 s with the hook at 300 s. Cancellation detected via `request.raw.on('close')`.

## Risks / Trade-offs

- [Rule too broad] → the app shows the exact rule and scope before confirming (change 14).
