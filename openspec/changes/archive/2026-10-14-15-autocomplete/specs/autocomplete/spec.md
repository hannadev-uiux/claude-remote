## Purpose

Offers in the app file (`@`) and skill/command (`/`) suggestions equivalent to those in the Claude Code TUI.

## ADDED Requirements

### Requirement: File search
`files.search { sessionId, query, limit }` SHALL return up to `limit` (default 20) files and folders from the session's `cwd` that fuzzy-match `query`, ignoring whatever `.gitignore` excludes.

#### Scenario: Partial search
- **WHEN** the app searches "mainap" in a session with `src/main/app.ts`
- **THEN** the result includes `src/main/app.ts` with `kind: "file"`

#### Scenario: Folders
- **WHEN** the app searches "src/comp"
- **THEN** the result includes `src/components/` with `kind: "dir"`

#### Scenario: node_modules ignored
- **WHEN** `node_modules` is in `.gitignore`
- **THEN** no path inside it appears

### Requirement: Command list
`commands.list { sessionId }` SHALL return commands with `name`, `description` and `source` (`builtin`, `profile`, `project`, `plugin`), read from the frontmatter of `skills/*/SKILL.md` and `commands/**/*.md` in the profile, the project (`.claude/`) and the profile's installed plugins, plus the fixed list of built-ins.

#### Scenario: Project skill
- **WHEN** the project has `.claude/skills/deploy/SKILL.md` with `name: deploy`
- **THEN** the list contains `/deploy` with `source: "project"`

#### Scenario: Cache invalidated
- **WHEN** a new `SKILL.md` is created in the profile
- **THEN** the next call already includes it

### Requirement: Suggestions in the app
When typing `@` or `/` (at the start of the prompt for `/`), the app SHALL show suggestions above the keyboard, updating with a 150 ms debounce, and insert `@path` or `/name ` on tap.

#### Scenario: Choose file
- **WHEN** the user types "@app" and taps `src/app.ts`
- **THEN** the text becomes "@src/app.ts "

### Requirement: Interactive commands
When sending a built-in command marked as interactive (`/model`, `/config`, `/permissions`, `/agents`, `/mcp`, `/resume`, `/login`), the app SHALL send it and open the session's raw terminal.

#### Scenario: /model
- **WHEN** the user sends "/model"
- **THEN** the command is sent and the raw terminal tab opens
