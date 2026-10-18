## Why

Starting a session from the app needs the directory typed by hand or picked from the recent list (issue #103). Typing a full path on a phone keyboard is slow and error-prone, and a folder never used with Claude Code before is not in the recent list at all.

## What Changes

- New `directories.list` client message and `directories.results` reply: the daemon lists the subdirectories of a directory inside the user's home, optionally filtered by a name prefix, with a flag for git checkouts.
- App: while typing the directory, the new-session screen suggests matching subfolders under the field (shell-style completion). Tapping a suggestion fills the field with a trailing `/` and keeps suggesting its children.
- App: a "Browse" button opens a folder picker sheet that starts at the typed directory (or the home folder), navigates into folders and up to the parent, can show hidden folders, and fills the field with the chosen folder.
- Daemons without `directories.list` answer `unknown_type`: the app hides the suggestions and the "Browse" button, and the screen works as before.

## Capabilities

### New Capabilities

### Modified Capabilities
- `session-lifecycle`: directory listing on the daemon and directory autocomplete / folder picker on the new-session screen.
- `protocol`: `directories.list` and `directories.results` join the message catalog.

## Impact

`packages/protocol`: new messages and `DirectoryItemSchema`, samples in the tests. `apps/daemon`: `infra/fs.ts` (read subdirectories), `features/lifecycle` (pure filtering + handler) and tests. `apps/mobile`: `features/lifecycle` (pure path helpers with Vitest tests, suggestions list, picker sheet, `NewSessionScreen`), i18n catalogs. `PROTOCOL_VERSION` stays 1: the messages are additive and the app detects older daemons.
