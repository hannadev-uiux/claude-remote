## 1. Protocol

- [x] 1.1 `DirectoryItemSchema`, `DIRECTORY_LIST_LIMIT`/`MAX_DIRECTORY_LIST_LIMIT`, `directories.list` client message and `directories.results` server message; samples and a limit test in the protocol tests

## 2. Daemon

- [x] 2.1 `readSubdirectories(dir)` and `hasGitMarker(dir)` in `infra/fs.ts` (symlinks to directories, `.git` directory or file)
- [x] 2.2 Pure `filterDirectories(names, { prefix, hidden, limit })` and `listDirectories(path, filter, home)` in `features/lifecycle/directories.ts` (validation, `parent`, `home`, unreadable → `invalid_cwd`); `validateCwd` expands `~` against the given home; tests in `test/directories.test.ts`
- [x] 2.3 `directories.list` handler registered in the lifecycle feature

## 3. App

- [x] 3.1 Pure `splitDirectoryInput`, `completeDirectory`, `directoryToBrowse`, `tildify` and `matchingSuggestions` in `features/lifecycle/directory-input.ts` with Vitest tests
- [x] 3.2 `useDirectories` query hook (reply plus the request it answers) and `useDirectoriesSupported` (daemon version that answered `unknown_type`), with a one-item probe when the screen opens
- [x] 3.3 Suggestions under the directory field in `NewSessionScreen` (focused field, 250 ms debounce, up to 8, git icon, tap fills `…/name/`); typecheck green, visual check on a device still pending
- [x] 3.4 `DirectoryPickerSheet` (enter, up, hidden toggle, choose, go back on errors, falls back to `~`, truncated hint) and the "Browse" button; typecheck green, visual check on a device still pending
- [x] 3.5 `newSession.browse` and `newSession.picker.*` in pt-BR, en-US and es-ES (i18n parity tests green)

## 4. Verification

- [x] 4.1 Typecheck + tests green (daemon 276, protocol 73, mobile 218), Biome clean on `apps`/`packages` and `npx expo export --platform ios` bundles
- [x] 4.2 `directories.list` exercised against an isolated daemon over WS: home listing with git markers and truncation, prefix match, hidden folders, `/etc` and a missing folder → `invalid_cwd`, `limit` 501 → `bad_request`
