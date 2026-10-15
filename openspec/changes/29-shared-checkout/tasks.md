## 1. Protocol

- [ ] 1.1 `SessionSchema.checkout`, `checkout.inspect`/`checkout.info`, `session.start.worktree`, `checkoutPeers` helper; verify with tests

## 2. Daemon

- [ ] 2.1 `infra/git.ts` (`GitClient.checkout`) and the `checkout` feature (cache, store listener); verify with tests
- [ ] 2.2 `checkout.inspect` and `session.start { worktree }` (`worktreeName`, `--worktree`); verify with tests and a run against a temporary repository

## 3. App

- [ ] 3.1 Session row: branch and shared checkout badge (pure helper reused); texts in the three languages
- [ ] 3.2 New-session screen: inspection, warning with confirmation, worktree switch; texts in the three languages

## 4. Docs

- [ ] 4.1 README; `pnpm check` and `openspec validate --strict`
