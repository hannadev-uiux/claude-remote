## ADDED Requirements

### Requirement: Project rules approved in a worktree session
When an "always allow" rule with scope `project` is approved for a session whose directory is a Claude Code worktree root (`<root>/.claude/worktrees/<name>`), the daemon SHALL record the rule against `<root>/.claude/settings.local.json`, the file Claude Code writes for worktrees, so that `remote-harness rules undo` removes it from there. Other directories keep `<cwd>/.claude/settings.local.json`.

#### Scenario: Rule approved in a worktree session
- **WHEN** the phone approves `Bash(pnpm test:*)` with scope `project` for a session in `~/work/api/.claude/worktrees/login`
- **THEN** the rules log names `~/work/api/.claude/settings.local.json`
