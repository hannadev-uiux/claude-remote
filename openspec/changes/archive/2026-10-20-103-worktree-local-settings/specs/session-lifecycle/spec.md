## ADDED Requirements

### Requirement: What an isolated copy inherits
`checkout.info` SHALL carry `worktreeCopy` with `localSettings` (whether the checkout root has `.claude/settings.local.json`) and `include` (the entries of the root's `.worktreeinclude`, without comments and blank lines, at most 12; empty when the file is missing). The daemon MUST NOT copy files into worktrees itself: Claude Code shares or copies the local settings and copies the `.worktreeinclude` files when it creates the worktree. When the worktree toggle is shown, the New session screen SHALL list under it what the isolated copy inherits: "Local permissions" when `localSettings` is true, then the include entries; with no entries, it SHALL show a hint to list git-ignored files in `.worktreeinclude`. All texts MUST be translated.

#### Scenario: Project with local permissions and an include file
- **WHEN** the directory's checkout has `.claude/settings.local.json` and a `.worktreeinclude` with `.env` and `# comment`
- **THEN** `checkout.info.worktreeCopy` is `{ localSettings: true, include: [".env"] }` and the screen lists local permissions and `.env` under the toggle

#### Scenario: No include file
- **WHEN** the checkout has no `.worktreeinclude`
- **THEN** the screen shows the hint to list git-ignored files in `.worktreeinclude`
