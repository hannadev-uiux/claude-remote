# autocomplete Specification

## Purpose
Offers in the app file (`@`) and skill/command (`/`) suggestions equivalent to those in the Claude Code TUI.

## Requirements

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
`commands.list { sessionId }` SHALL return commands with `name`, `description` and `source` (`builtin`, `profile`, `project`, `plugin`), read from the frontmatter of `skills/*/SKILL.md` and `commands/**/*.md` in the profile, the project (`.claude/`) and the profile's installed plugins, plus the table of built-ins. The built-in table SHALL match the current Claude Code CLI (the version it was checked against is named in the table), have no duplicate names, and leave out commands that would cut the remote control off or only concern the local terminal (such as `/logout`, `/remote-control`, `/terminal-setup`).

#### Scenario: Project skill
- **WHEN** the project has `.claude/skills/deploy/SKILL.md` with `name: deploy`
- **THEN** the list contains `/deploy` with `source: "project"`

#### Scenario: Cache invalidated
- **WHEN** a new `SKILL.md` is created in the profile
- **THEN** the next call already includes it

#### Scenario: Native command
- **WHEN** the app lists commands of a Claude Code session
- **THEN** the list contains `/rename`, `/add-dir` and `/tasks` with `source: "builtin"`

### Requirement: Suggestions in the app
When typing `@` or `/` (at the start of the prompt for `/`), the app SHALL show suggestions above the keyboard, updating with a 150 ms debounce for files, and insert `@path` or `/name ` on tap. For `/` with no query it SHALL list every command, with no item limit, grouped in sections in this order: *Recent*, *Built-in*, *Project*, *Profile*, *Plugins* (empty sections hidden, a recent command not repeated in its own section). With a query it SHALL show one list ranked by name prefix, then name substring, then fuzzy (subsequence) match on the name, then description match, with recent commands first among equal matches, and highlight the matched characters of the name. Each command row SHALL show the name, a one-line description (built-ins translated by name, others in the text the daemon sends), the source badge and an indicator for interactive commands, with a tap target of at least 44 pt. The list height SHALL follow the space left above the keyboard. When nothing matches it SHALL say "no commands match".

#### Scenario: Choose file
- **WHEN** the user types "@app" and taps `src/app.ts`
- **THEN** the text becomes "@src/app.ts "

#### Scenario: Only a slash
- **WHEN** the session has 40 built-ins, 3 project skills and 30 plugin commands and the user types "/"
- **THEN** all 73 commands can be reached by scrolling, under the Built-in, Project and Plugins headers

#### Scenario: Fuzzy match
- **WHEN** the user types "/rnm"
- **THEN** `/rename` is listed with "r", "n" and "m" highlighted

#### Scenario: Prefix first
- **WHEN** the user types "/co" and the list has `compact`, `config`, `context`, `copy` and `deploy-config`
- **THEN** the four commands that start with "co" come before `deploy-config`

#### Scenario: No match
- **WHEN** the user types "/zzzz"
- **THEN** the list shows "no commands match"

### Requirement: Interactive commands
When sending a built-in command marked as interactive (for example `/model`, `/config`, `/permissions`, `/mcp`, `/resume`, `/login`, `/tasks`), the app SHALL send it and open the session's raw terminal.

#### Scenario: /model
- **WHEN** the user sends "/model"
- **THEN** the command is sent and the raw terminal tab opens

### Requirement: Recent commands
The app SHALL remember, per profile and on the device only, the commands sent from it (a prompt that starts with `/<name>` naming a listed command): the name, the last use and a use count, at most 20 per profile. The five most recently used that are in the session's list SHALL form the *Recent* section with no query. "Forget the machine" SHALL clear them.

#### Scenario: Used before
- **WHEN** the user sent "/compact" yesterday in a session of the same profile and now types "/"
- **THEN** `/compact` is the first row, under *Recent*

#### Scenario: Other profile
- **WHEN** the user sent "/compact" only in sessions of another profile
- **THEN** `/compact` is not under *Recent* for this profile
