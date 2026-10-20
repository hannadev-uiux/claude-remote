## 1. Daemon

- [x] 1.1 `ExecResult.timedOut`; `GitClient.must` messages (stderr, timeout, exit code); tests
- [x] 1.2 `parseWorktreeList`, `lockPid` (pure) and `removeWorktree` as unlock → move → prune → branch → background delete, with the `EXDEV` fallback; injected fs and liveness; unit tests and a real-repository test (ignored folder, stale lock, live lock, failed move)
- [x] 1.3 `CloseService`: re-inspect before a non-forced removal, log failures with the path; tests (untracked file, changes appearing while exiting)

## 2. App

- [x] 2.1 `CloseSessionSheet` failure state with Retry (cleanup when the session ended) and Keep the worktree; i18n (three catalogs)

## 3. Verify

- [x] 3.1 `pnpm check`, `openspec validate --strict`, iOS bundle export
