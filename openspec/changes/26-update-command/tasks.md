## 1. Daemon

- [ ] 1.1 `features/update` (source root check, version parsing, git fetch/compare/checkout via `Executor`); verify with tests
- [ ] 1.2 `claude-remote update` and the hidden `--finish` step (install refresh, service restart, versions); messages in the three languages
- [ ] 1.3 `install.sh --update` (no wizard, calls `update --finish --from`); verify with the shell tests and a run in a temporary home

## 2. Docs

- [ ] 2.1 README section; `pnpm check` and `openspec validate --strict`
