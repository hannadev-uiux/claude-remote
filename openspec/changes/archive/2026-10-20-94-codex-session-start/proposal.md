## Why

Starting a Codex session from the app looks successful (the new-session screen closes as if a session had been created), but nothing is created: the daemon offers a Codex profile in `auth.ok` without checking that the `codex` binary is actually resolvable on its PATH, and a settle-check failure that follows always blames "Claude Code" regardless of which agent was launched. Investigation (issue #244) traced this to `resolveProfiles` only checking a profile's config dir and adapter, never its binary, and `LifecycleService.start()` hardcoding the Claude Code name in its only failure message. A third, unrelated gap compounds the "no trace in the daemon log" symptom: `ws-server.ts` answers a malformed WebSocket message with an `error` reply but never logs it or feeds it into the diagnostics ring buffer, even though the existing `protocol` spec already requires every rejected request to be logged and tracked — that part is a plain bug fix against the current spec, not a new requirement.

## What Changes

- `auth.ok`'s profile list SHALL exclude a profile whose agent CLI cannot be resolved on the daemon's PATH (checked with `which <command>`), logging a warning naming the profile and the agent. This is additive and narrower than the existing configDir/adapter checks: `resolveProfiles` itself (used by `install`, `uninstall`, `remote-harness update` and the running `LifecycleService`) is unchanged, so install/uninstall still manage a profile's launcher even when its CLI is not yet on PATH.
- `LifecycleService.start()`'s settle-check failure names the actual agent (`agentFor(profile).name`, e.g. "Codex") instead of hardcoding "Claude Code".
- `doctor` checks whether `codex` is on PATH even when no Codex profile is configured yet (today the check is skipped entirely without any configured Codex profile), and additionally flags a `~/.codex` directory found without a matching profile, pointing at `remote-harness setup`.
- Fixed, no spec change (the current `protocol` spec already requires this): `ws-server.ts` logs a malformed/unauthenticated-schema-rejected WS message and records it in the diagnostics ring buffer, like every other rejected request already does.

## Non-Goals

- A "Codex is not set up on this machine" empty state on the new-session screen (issue #244's "Expected" section asks for it, but today there is no concept of an agent that could exist but has no profile — the screen only ever lists real profiles; inventing that concept is a bigger UI feature than this fix, and the profile-exclusion fix above already prevents the reported false-success symptom without it).
- Showing the first lines of the failed pane's output in the settle-check error: tmux's panes close the instant their command exits (`remain-on-exit` is `off` everywhere in this project), so by the time the daemon notices the pane is gone there is nothing left to capture. Doing this would mean changing every launched window's tmux lifecycle (`remain-on-exit on` plus explicit cleanup) for a diagnostics message, which is a larger and riskier change than this issue's core bug warrants.
- Refreshing a running daemon's PATH after installing an agent CLI (launchd/systemd capture PATH once, at install time); `doctor`'s new hint hints at `remote-harness setup` instead of trying to fix PATH propagation itself.

## Capabilities

### New Capabilities

### Modified Capabilities
- `daemon-config`: `auth.ok`'s profile list additionally excludes profiles whose agent binary cannot be resolved.
- `session-lifecycle`: the "Claude Code exited right away" settle-check failure names the actual agent.
- `codex-sessions`: `doctor` checks for `codex` on PATH and suggests `remote-harness setup` even without a configured Codex profile.

## Impact

`apps/daemon/src/core/config.ts` (new `profilesWithResolvableAgent` helper), `apps/daemon/src/main.ts` (uses it for `hello().profiles` only), `apps/daemon/src/features/lifecycle/service.ts` (agent-aware error), `apps/daemon/src/cli.ts` (`doctor`'s Codex check), `apps/daemon/src/transport/ws-server.ts` (logs/records malformed-message rejections). No protocol schema change.
