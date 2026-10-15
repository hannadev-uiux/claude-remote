## 1. Daemon

- [x] 1.1 `features/update` (source root check, version parsing, git fetch/compare/checkout via `Executor`); verify with tests
- [x] 1.2 `claude-remote update` and the hidden `--finish` step (install refresh, service restart, versions); messages in the three languages
- [x] 1.3 `install.sh --update` (no wizard, calls `update --finish --from`); verify with `bash -n` and an end-to-end run in an Ubuntu container (install, up to date, 0.3.0 → 0.3.1, local changes, `install.sh --update`)

## 2. Docs

- [x] 2.1 README section; `pnpm check` and `openspec validate --strict`
