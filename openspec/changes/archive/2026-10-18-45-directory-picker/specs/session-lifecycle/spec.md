## ADDED Requirements

### Requirement: Directory listing
`directories.list { path, prefix?, hidden?, limit? }` SHALL validate `path` like `session.start` (`~` expanded; missing or outside the home folder → `error` `invalid_cwd`) and reply `directories.results { path, parent, home, items, truncated }`. `items` MUST contain only subdirectories (including symlinks to directories), each with `name`, absolute `path` and `git` (true when it contains `.git`), sorted case-insensitively by name. `prefix` MUST filter names by a case-insensitive start match. Names starting with `.` MUST be left out unless `hidden` is true. At most `limit` items (default 200, max 500) are returned, with `truncated` true when more matched. `parent` MUST be `null` when `path` is the home folder. A directory the daemon cannot read MUST produce `error` `invalid_cwd`.

#### Scenario: Complete a prefix
- **WHEN** the app lists `~` with prefix `doc` and the home has `Documents`, `docker` and `Desktop`
- **THEN** the reply has `docker` and `Documents`, in that order, and no `Desktop`

#### Scenario: Hidden folders
- **WHEN** the app lists `~` without `hidden` and the home has `.config` and `work`
- **THEN** the reply has only `work`; with `hidden` true it has both

#### Scenario: Outside home
- **WHEN** the app lists `/etc`
- **THEN** the daemon replies `error` `invalid_cwd`

#### Scenario: Git checkout marker
- **WHEN** a listed folder contains a `.git` directory or file
- **THEN** its item has `git` true

### Requirement: Directory autocomplete and folder picker
The new-session screen SHALL suggest the subfolders matching the typed directory while the field is focused, using `directories.list` on the directory part of the text and its last segment as the prefix, and tapping a suggestion MUST fill the field with that folder followed by `/`. A "Browse" button SHALL open a folder picker that starts at the typed directory (or the home folder when it is empty or invalid), lets the user enter folders, go up to the parent (never above the home folder), toggle hidden folders and choose the current folder, which fills the field. When the daemon answers `directories.list` with `unknown_type`, the screen MUST hide the suggestions and the "Browse" button.

#### Scenario: Suggest while typing
- **WHEN** the user types `~/Doc`
- **THEN** the screen suggests `Documents` and tapping it fills `~/Documents/` and suggests its subfolders

#### Scenario: Pick a folder
- **WHEN** the user opens "Browse", enters `work` and then `api`, and taps "Choose this folder"
- **THEN** the field contains `~/work/api`

#### Scenario: Older daemon
- **WHEN** the daemon does not know `directories.list`
- **THEN** no suggestions and no "Browse" button are shown, and typing the directory still works
