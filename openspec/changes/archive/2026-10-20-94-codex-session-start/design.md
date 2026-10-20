## Context

`resolveProfiles` (`apps/daemon/src/core/config.ts:131`) drops a profile only when its agent has no adapter (`hasAgentAdapter`) or its `configDir` does not exist; it never checks the agent's CLI binary. Its single return value is reused for four different purposes: `main.ts:146` (`ctx.profiles`, used by `LifecycleService` to launch/resume and by `hello()` for what the app sees in `auth.ok`), and three `cli.ts` commands (`install`, `uninstall`, `finishUpdate`) that use it only to know which launcher files to create or remove. `LifecycleService.start()` (`features/lifecycle/service.ts:87`) hardcodes `"Claude Code exited right away…"` in its only failure path, regardless of which agent was actually launched. `doctor` (`cli.ts:415`) only runs its Codex PATH/hooks check `if (codexProfiles.length > 0)`. `ws-server.ts:81-91` replies to a schema-validation failure but never calls into `MessageRouter`'s rejection path (`logger.warn` + the `RejectionLog` diagnostics ring buffer), which every other rejection already goes through — this is already required by the `protocol` spec's "Daemon diagnostics" requirement ("every rejected WS request"), so fixing it needs no spec change.

## Goals / Non-Goals

**Goals:**
- Stop the app from ever being able to pick a Codex profile that cannot actually start a session, closing the "looks successful, nothing happens" symptom at its root.
- Make the one failure message `LifecycleService.start()` can produce correctly name the agent that failed.
- Make `doctor` actionable even before a Codex profile exists, matching issue #244's "Setup: add a Codex profile from doctor when codex is found".
- Fix the silent gap in `ws-server.ts` so a malformed `session.start` (or any other message) leaves a trace, per the existing diagnostics requirement.

**Non-Goals:** see proposal.md's "Non-Goals" (no "Codex not set up" app UI, no pane-output capture, no PATH-refresh-on-install).

## Decisions

- **The binary check is additive and scoped to `auth.ok`, not folded into `resolveProfiles`.** `resolveProfiles`'s result also drives `install`/`uninstall`/`finishUpdate`, which manage a profile's launcher file — a launcher should exist (and be removable) regardless of whether its target CLI happens to be on PATH *right now*, since installing the launcher is usually the step that makes the CLI reachable from tmux in the first place, and `codex`/`claude` can also move around (brew upgrade, reinstall) without the profile becoming invalid. Only `main.ts`'s own `hello()` closure needs the narrower list, computed once at startup via a new `profilesWithResolvableAgent(profiles, exec, logger)` in `core/config.ts` (same `which <command>` approach `doctor` already uses, now shared instead of doctor-only).
- **`which <adapter.command>` is the resolvability check**, reusing `AgentAdapter.command` (already "Command on the PATH that starts the CLI") so the check is agent-generic, not Codex-specific — a Claude Code profile with a broken PATH is excluded the same way.
- **`LifecycleService.start()`'s error uses `agentFor(profile).name`** instead of the literal "Claude Code"; the rest of the message (pane id, "exited right away") is unchanged.
- **`doctor`'s Codex check runs unconditionally for the PATH part**, and separately detects `~/.codex` without a matching profile using the same `detectConfigDirs`/markers `setup` already has (`features/setup/profiles.ts`), reusing that logic instead of duplicating Codex's marker-file list.
- **`ws-server.ts`'s parse-failure branch now calls the same `logger.warn` + rejection-listener path `MessageRouter.dispatch` uses for `unknown_type`.** `ParseError` gains an optional `type?: string` (the raw, possibly-invalid `type` field read during parsing) purely for this internal logging/diagnostics use — it is never sent over the wire (the `error` reply ws-server.ts sends still only carries `id`, `code`, `message`, unchanged), so this is not a protocol/wire change.

## Risks / Trade-offs

- [A profile excluded from `auth.ok` because `which` failed is invisible to the app, with no "why" shown anywhere in the UI] → Mitigation: accepted, matches this change's non-goal (no app UX for this is in scope); the daemon log and `doctor` both explain it for whoever can read them.
- [`which` reflects the daemon process's own `PATH` (stale under launchd after installing a CLI later, per issue #244's own finding) — a profile could stay hidden until the service restarts] → Mitigation: out of scope (see proposal.md); `doctor` already tells the user to reinstall/restart in the adjacent PATH checks, same remedy applies here.
