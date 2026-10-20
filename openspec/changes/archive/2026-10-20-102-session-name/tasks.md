## 1. Protocol

- [x] 1.1 `SessionNameSchema` / `SESSION_NAME_MAX` and `session.start.name`, with tests.

## 2. Daemon

- [x] 2.1 `worktreeSlug` and `worktreeCandidates` in `checkout/resolver.ts`, with tests.
- [x] 2.2 Agent adapters: `nameArgs` (Claude Code `--name`, Codex `null`).
- [x] 2.3 `LifecycleService.start`: name args, free worktree name (`hasBranch` in `infra/git.ts`), title at once or pending per pane; handler passes `name` (tests).

## 3. App

- [x] 3.1 `cleanSessionName` and `nameSuggestions` in `lifecycle/new-session.ts`, with tests.
- [x] 3.2 Name field and suggestion chips on the New session screen; i18n in pt-BR, en-US and es-ES.

## 4. Validation

- [x] 4.1 `pnpm check` green and `npx expo export --platform ios` bundles.
