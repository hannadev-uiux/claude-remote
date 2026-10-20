## 1. Profile binary check

- [ ] 1.1 Add `profilesWithResolvableAgent(profiles, exec, logger)` to `apps/daemon/src/core/config.ts`: for each profile, `agentFor(profile).command` run through `exec('which', [command])`; keep it when `exitCode === 0`, else drop it and `logger.warn` with the profile id, agent id and command. Vitest test with a fake `Executor` covering both outcomes.
- [ ] 1.2 In `apps/daemon/src/main.ts`, compute `const appProfiles = await profilesWithResolvableAgent(profiles, options.exec, logger)` right after `resolveProfiles`, and use `appProfiles` only in `hello()`'s `profiles` field; `ctx.profiles` and every other use of `profiles` stay the full `resolveProfiles` result. Verify `install`/`uninstall`/`finishUpdate` in `cli.ts` are untouched (they call `resolveProfiles` directly, not the new function).
- [ ] 1.3 Test (likely in `test/core.test.ts` or a new daemon-startup-focused test) that a Codex profile with an unresolvable binary is absent from `hello.profiles` / `auth.ok` while still present in whatever drives `install`.

## 2. Agent-aware settle-check error

- [ ] 2.1 In `apps/daemon/src/features/lifecycle/service.ts`'s `start()`, replace the hardcoded `"Claude Code exited right away…"` with `` `${agentFor(profile).name} exited right after starting (pane ${paneId} closed)` ``.
- [ ] 2.2 Extend `test/lifecycle.test.ts`'s existing "fails when Claude Code exits before the settle check" coverage with a Codex-profile case asserting the message says "Codex", not "Claude Code".

## 3. Doctor: Codex PATH and orphan account

- [ ] 3.1 In `cli.ts`'s `doctor` action, compute `codexProfiles` as today, plus `detectConfigDirs()` filtered to `isCodexDir` (`codexDirs`) and to those with no matching profile (`sameDir`) among `config.profiles` (`orphanCodexDirs`); run the `which codex` check when `codexProfiles.length > 0 || codexDirs.length > 0` (today: only the former), unchanged otherwise; keep the per-profile hooks loop and the "Codex trust" line scoped to `codexProfiles.length > 0`.
- [ ] 3.2 Print `d.codexAccountWithoutProfile(dir)` for each `orphanCodexDirs` entry, pointing at `remote-harness setup`; add the key (and its pt-BR/es-ES translations) to `core/i18n/{en-US,pt-BR,es-ES}.ts`'s `cli.doctor` block; run the i18n parity test.
- [ ] 3.3 Vitest coverage (likely `test/setup.test.ts` or a doctor-focused test) for: PATH checked with only an orphan `~/.codex` dir (no profile); PATH and hooks checks skipped with neither signal; orphan message shown/not shown.

## 4. Diagnostics logging for malformed messages

- [ ] 4.1 Add an optional `type?: string` to `ParseError` (`packages/protocol/src/parse.ts`), set from the raw (possibly unknown/invalid) `record.type` wherever `parseWith` already reads it, for both the `unknown_type` and schema-validation-failure branches. The wire `error` reply this feeds (`id`, `code`, `message` only) is unchanged — this field is for server-side use only.
- [ ] 4.2 In `apps/daemon/src/transport/ws-server.ts`'s `parsed.ok === false` branch, call `log.warn({ type: parsed.error.type, code: parsed.error.code }, 'request rejected')` and feed the same `(type, code)` into whatever the router's `onRejected` listeners expect (likely exposing a small helper from `transport/router.ts`, or constructing the `RejectedRequest` the same way `MessageRouter.dispatch` does) so it also lands in the `diagnostics.errors` ring buffer, matching how every other rejection is already recorded.
- [ ] 4.3 Vitest test (`test/transport.test.ts`) sending a malformed authenticated message and asserting both the log call and that `diagnostics.errors` afterwards lists it.

## 5. Validation

- [ ] 5.1 `pnpm --filter @remote-harness/daemon typecheck|test`, `pnpm --filter @remote-harness/protocol typecheck|test`, full `pnpm check`, `biome check --error-on-warnings apps packages`.
- [ ] 5.2 Manual check on a machine with a Codex profile whose `codex` is briefly removed from PATH: confirm the new-session screen no longer offers it, and that it reappears once `codex` is back and the daemon restarts. Not runnable in this sandbox (no real Codex install); record as a pre-release manual step.
