## Context

See proposal.md for the bug and the requested scope. Two sub-problems need technical decisions before coding: (1) continuous recording without a native pause API, and (2) where "Polish dictation" runs without breaking the existing hard privacy requirement that voice data never reaches the daemon or a network service.

`expo-speech-recognition` (`^57.1.1`) has no `pause()`/`resume()`: only `start()`, `stop()` (flushes a final result) and `abort()` (discards). `continuous: true` keeps listening across silences; an iOS audio interruption (call, Siri, alarm) ends the session early with error code `interrupted`, distinct from a user-caused stop.

The daemon never runs an agent CLI directly today — it only drives `tmux` panes through per-profile launcher scripts (`features/lifecycle/service.ts`, `features/hooks/launcher.ts`). `ctx.exec: Executor` (`infra/exec.ts`) is the injected subprocess runner already used by every other daemon feature that shells out (tmux, git, security); `AgentAdapter` (`features/agents/types.ts`) already models everything that differs between agent CLIs (command, config dir env, resume args, etc.) and is resolved from a session via `features/autocomplete/index.ts`'s `sessionContext` pattern (session → profile via `ctx.profiles`, adapter via `agentFor`).

## Goals / Non-Goals

**Goals:**
- Fix the reported bug (recording silently ends and inserts a partial transcript) without changing the composer's basic interaction model.
- Add pause/resume and push-to-talk as genuinely optional, off-by-default affordances that don't complicate the default tap-to-record path.
- Let "Polish dictation" reuse the user's already-authenticated `claude` CLI instead of adding new credential management, while keeping it strictly opt-in and gracefully degrading to the original transcript on any failure.

**Non-Goals:**
- Transcribing audio on the daemon or in the cloud (the issue's "Option B"). Recognition stays on-device; only the already-produced text is optionally sent to the daemon for polishing.
- Polishing for Codex, Qwen, Kimi, or any OpenRouter-routed profile. `AgentAdapter.polish` is `null` for every adapter except Claude Code on its default (Anthropic) auth; an unsupported profile silently skips polishing (falls back to the original transcript, no error surfaced).
- Any new settings/credentials UI for polishing — it rides on the CLI session the user already has.

## Decisions

**Segments instead of a native pause.** `useVoiceRecording` keeps an ordered list of finalized segment strings. Each native session (one per `start()`/resume) ends with a final `result` event that appends one segment; the committed transcript is always `segments.join(' ')` (normalizing whitespace). Pausing calls the native `stop()` (flushes the current segment, stops listening) and sets `state: 'paused'`; resuming calls `start()` again, appending further segments as they finalize. This needs no native change and reuses the exact mechanism `stop()` already provides.

**Interruption is a pause, not a discard.** The `interrupted` error code (phone call, Siri, alarm) is classified as a dedicated outcome distinct from `retry`/`denied`: whatever was transcribed is kept as segments and the state becomes `paused`, same UI as a manual pause, so the user resumes instead of losing the recording.

**Max duration is a client-side cap, not a recognizer option.** `MAX_RECORDING_MS = 10 * 60_000`; when cumulative elapsed time reaches it, the hook calls its own `stop()` exactly as if the user had tapped it. No separate "time's up" state.

**Review step only when there's something to review.** After the final segment settles, if "Polish dictation" is on and the profile's adapter supports it, the hook requests `voice.polish`; if the result differs from the original and was actually applied, the state becomes `reviewing` with both texts and the user picks one. If polishing is off, unsupported, failed, timed out, or returned the text unchanged, the raw transcript is inserted immediately — today's zero-friction path is unchanged in every case except an actual, successful rewrite.

**Polishing runs through the existing agent CLI, not a new credential path.** The daemon feature resolves the session's profile and adapter (`agentFor`), and only proceeds when `adapter.polish` is defined and the profile has no `provider` (OpenRouter routing is out of scope, see Non-Goals). It runs `ctx.exec(adapter.command, adapter.polish.args(text), { cwd: <scratch tmp dir>, env: <CLAUDE_CONFIG_DIR when the profile's configDir isn't the default, mirroring `isDefaultConfigDir`/`renderLauncher`>, timeoutMs: 9500 })`. The scratch cwd (not the session's project directory) means no project `CLAUDE.md`, hooks, or skills are discovered — the same isolation `--bare` would give, without `--bare`'s requirement of an explicit `ANTHROPIC_API_KEY` (which would break for most users, who authenticate the CLI via login instead of an env var). Args: `-p <text> --model haiku --output-format json --allowedTools "" --append-system-prompt <rewrite-only instruction>`. `--allowedTools ""` denies every tool regardless of bare mode. The response's `.result` field is the rewritten text; any non-zero exit, timeout, or unparsable output degrades to `{ text: original, applied: false }` — the handler never throws for a failed rewrite, only for a request naming an unknown session/profile (existing `not_found` pattern).

**Protocol shape.** `{ type: 'voice.polish', id, sessionId, text }` → `{ type: 'voice.polish.result', replyTo, text, applied: boolean }`, following the existing `files.search`/`files.results` and `provider.status`/`provider.info` request/response pairs exactly (session-scoped request, `replyTo`-correlated result, `sessionContext` resolution, one new `DaemonContext`-free feature module).

## Risks / Trade-offs

- [Segment joins can read awkwardly at a pause boundary (e.g. missing connecting word)] → Acceptable: the user can always edit the inserted text before sending, same as today's single-segment transcript.
- [A user on a provider-routed or non-Claude-Code profile enables "Polish dictation" and sees no effect] → Settings copy for the toggle notes "Claude Code sessions only"; the per-recording fallback is silent by design (Decisions), consistent with how `retryOnline` already degrades gracefully elsewhere in this feature.
- [Running `claude -p` costs the user's own API usage/quota] → Opt-in only, `--model haiku` (cheapest/fastest), and a hard 9.5s external timeout bound the cost of any single call.
- [`--allowedTools ""` or `--append-system-prompt` flag names change in a future Claude Code release] → `adapter.polish.args` is isolated in one place (`features/agents/claude.ts`) and covered by a unit test asserting the exact argv, so a CLI change surfaces as a clear test failure rather than a silent behavior change.
