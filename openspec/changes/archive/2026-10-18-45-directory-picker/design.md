## Context

`NewSessionScreen` has a free text field for the directory and the recent projects list (`projects.list`). `validateCwd` in the lifecycle feature already restricts `session.start` and `checkout.inspect` to existing directories inside the home folder. The daemon has no way to list a directory today; `files.search` searches files of a session's project, not the machine.

## Goals / Non-Goals

**Goals:**
- Suggest subfolders while typing the directory, shell-style.
- Browse the folders of the home directory and pick one without typing.
- Work with any home layout (`/Users/<me>` on macOS, `/home/<me>` on Linux/WSL).

**Non-Goals:**
- Listing files, or anything outside the home folder.
- Creating, renaming or deleting folders from the app.
- Fuzzy matching or searching the whole tree (only the children of one directory are listed).

## Decisions

- **One message for both features.** `directories.list { path, prefix?, hidden?, limit? }` replies `directories.results { path, parent, home, items, truncated }`. `path` accepts `~`, `~/…` or an absolute path and is validated with `validateCwd` (outside home or missing → `invalid_cwd`). `items` are `{ name, path, git }` sorted case-insensitively by name. `parent` is `null` at the home folder so the picker cannot leave it. `home` lets the app show paths as `~/…` on any OS. `limit` defaults to 200 (max 500); `truncated` says more entries matched.
- **Home expansion.** `validateCwd` expands `~` against the home it is given (it used the process home before), so the listing and its tests agree on the home folder.
- **Filtering on the daemon.** `prefix` matches the start of the name case-insensitively. Names starting with `.` are left out unless `hidden` is true; the app sets `hidden` when the typed prefix starts with `.`. Filtering, sorting and the limit are a pure function (`filterDirectories`) with tests; reading the directory stays in `infra/fs.ts` (`readSubdirectories`), which also follows symlinks to directories and marks entries that contain `.git` (a directory, or a file for worktrees). The `.git` check runs only for the entries that survive the filter and the limit.
- **Unreadable directories.** `EACCES`/`EPERM` (for example macOS privacy-protected folders the daemon was not granted) reply `invalid_cwd` with the reason, and the picker shows a translated "can't open this folder" message. No new error code, so older apps still parse the reply.
- **Pure path helpers in the app.** `splitDirectoryInput(text)` turns the field into `{ dir, prefix }` (`~/Doc` → `~` + `Doc`; `~/Documents/` → `~/Documents` + empty; a relative name is relative to `~`; empty text → no suggestions). `completeDirectory(dir, name)` joins with a trailing `/`. `tildify(path, home)` renders `~/…`. All have Vitest tests.
- **Suggestions under the field.** A debounced (250 ms) `directories.list` with the split `dir`/`prefix` and `limit` 20 runs while the field is focused and non-empty. Up to 8 suggestions show as rows under the field with a folder (or git) icon; tapping one fills the field and keeps focus, so the next level is suggested. Errors (missing dir, older daemon) show no suggestions.
- **Picker sheet.** A `Modal` bottom sheet like the other sheets in the app: header with the current path (`~/…`), an "up" row when `parent` is not `null`, folder rows (tap to enter), a "show hidden" switch, and "Choose this folder" / "Cancel". It opens at the typed directory when the daemon accepts it, else at `~`. Choosing fills the field with the `~/…` form.
- **Older daemons.** The screen sends a one-item probe (`~`, `limit` 1) when it opens. A `directories.list` answered with `unknown_type` marks the daemon version that answered as unsupported, hiding the "Browse" button and the suggestions; a daemon update (new version in `auth.ok`) tries again.

## Risks / Trade-offs

- [macOS privacy prompts] → reading `~/Documents`, `~/Desktop` or `~/Downloads` may ask for access on the Mac the first time, or fail with `EPERM` under launchd. The picker shows the error; the user can grant access or type the path.
- [Large directories] → the limit caps the reply; `truncated` tells the picker to show a "more folders, type to filter" hint.
- [Symlinks pointing outside home] → the same lexical home check `session.start` already uses; listing only shows names, never file contents.
