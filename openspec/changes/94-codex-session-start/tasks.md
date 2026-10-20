## 1. Profile binary check

- [x] 1.1 Add `profilesWithResolvableAgent(profiles, exec, logger)` to `apps/daemon/src/core/config.ts`: for each profile, `agentFor(profile).command` run through `exec('which', [command])`; keep it when `exitCode === 0`, else drop it and `logger.warn` with the profile id, agent id and command. Vitest test with a fake `Executor` covering both outcomes.
- [x] 1.2 In `apps/daemon/src/main.ts`, compute `const appProfiles = await profilesWithResolvableAgent(profiles, options.exec, logger)` right after `resolveProfiles`, and use `appProfiles` only in `hello()`'s `profiles` field; `ctx.profiles` and every other use of `profiles` stay the full `resolveProfiles` result. `install`/`uninstall`/`finishUpdate` in `cli.ts` are untouched (they call `resolveProfiles` directly, not the new function).
- [x] 1.3 Test in `test/core.test.ts` (`profilesWithResolvableAgent` describe block) that a Codex profile with an unresolvable binary is dropped while a resolvable Claude profile stays, with the warning asserted.

## 2. Agent-aware settle-check error

- [x] 2.1 In `apps/daemon/src/features/lifecycle/service.ts`'s `start()`, replaced the hardcoded `"Claude Code exited right away…"` with `` `${agentFor(profile).name} exited right after starting (pane ${paneId} closed)` ``.
- [x] 2.2 Added a Codex-profile case to `test/lifecycle.test.ts` asserting the message says "Codex exited right after starting", not "Claude Code"; the existing Claude Code case (no `agent` field) still passes unchanged.

## 3. Doctor: Codex PATH and orphan account

- [x] 3.1 `cli.ts`'s `doctor` action now computes `codexProfiles` as before plus `codexDirs` (`detectConfigDirs()` filtered to `isCodexDir`); the `which codex` check runs when `codexProfiles.length > 0 || codexDirs.length > 0`; the per-profile hooks loop and the "Codex trust" line stay scoped to `codexProfiles.length > 0`.
- [x] 3.2 Prints `d.codexAccountWithoutProfile(dir)` for each `codexDirs` entry with no matching profile (`sameDir`, now exported from `features/setup/profiles.ts`), pointing at `remote-harness setup`; the key and its pt-BR/es-ES translations are in `core/i18n/{en-US,pt-BR,es-ES}.ts`'s `cli.doctor` block; the i18n parity test (`test/i18n.test.ts`) passes unchanged.
- [x] 3.3 `doctor`'s action itself has no prior test coverage to extend (it's an inline CLI action, not an exported function) and refactoring it into a testable shape was judged out of proportion for this fix. Instead, added direct Vitest coverage in `test/setup.test.ts` for the two newly-exported pure pieces the new branches depend on: `isCodexDir` and `sameDir` (previously internal, now exported for this reuse). `detectConfigDirs` itself already had coverage.

## 4. Diagnostics logging for malformed messages

- [x] 4.1 Added an optional `type?: string` to `ParseError` (`packages/protocol/src/parse.ts`), set from the raw `record.type` in both the `unknown_type` branch (only when it really is a string) and the schema-validation-failure branch (always, since that branch is only reached once `type` is a known valid string). The wire `error` reply is unchanged (`id`, `code`, `message` only).
- [x] 4.2 `MessageRouter` (`apps/daemon/src/transport/router.ts`) gained a public `reportRejected(type, code)` that does exactly what `dispatch`'s `DaemonError` branch already does (`logger.warn` + notify rejection listeners), without touching `dispatch`'s own three call sites or their existing log levels. `ws-server.ts`'s `parsed.ok === false` branch now calls `router.reportRejected(parsed.error.type ?? '(malformed)', parsed.error.code)`.
- [x] 4.3 Added a test to `test/transport.test.ts`: an authenticated malformed `session.input` (missing `sessionId`) is asserted to both call `logger.warn` with `{ type: 'session.input', code: 'bad_request' }` and show up in a following `diagnostics.errors` reply.
- [x] 4.4 (not in the original plan, needed to make 4.1 meaningful) Extended `packages/protocol/test/protocol.test.ts`'s existing parse-error tests to assert `error.type`: present for a known-type schema failure, present for an unknown-but-string type, absent for invalid JSON and for a non-string `type`.

## 5. Validation

- [x] 5.1 `pnpm --filter @remote-harness/daemon typecheck|test` (530 tests), `pnpm --filter @remote-harness/protocol typecheck|test` (121 tests), full `pnpm check` (daemon/mobile/protocol typecheck+test all green), `biome check --error-on-warnings apps packages` (596 files, clean). The repo-root `biome check --error-on-warnings .` step of `pnpm check` itself still fails in this sandbox for the same unrelated, pre-existing reason noted in change 92's tasks.md (git-worktree path resolution), not caused by this change.
- [ ] 5.2 Manual check on a machine with a Codex profile whose `codex` is briefly removed from PATH: confirm the new-session screen no longer offers it, and that it reappears once `codex` is back and the daemon restarts. **Not run** — no real Codex install in this sandbox; record as a pre-release manual step.
