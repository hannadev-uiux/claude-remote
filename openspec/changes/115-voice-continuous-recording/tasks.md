## 1. Protocol

- [ ] 1.1 Add `voice.polish` to `ClientMessageSchema` (`id`, `sessionId`, `text`) in `packages/protocol/src/client.ts` and `voice.polish.result` to `ServerMessageSchema` (`replyTo`, `text`, `applied: boolean`) in `packages/protocol/src/server.ts`; verify `pnpm --filter @remote-harness/protocol test` passes.

## 2. Daemon: agent adapter polish support

- [ ] 2.1 Add `polish: { args(text: string): string[] } | null` to `AgentAdapter` (`apps/daemon/src/features/agents/types.ts`).
- [ ] 2.2 Implement it for Claude Code (`claude.ts`): `args(text) => ['-p', text, '--model', 'haiku', '--output-format', 'json', '--allowedTools', '', '--append-system-prompt', <rewrite-only instruction>]`; set `polish: null` for Codex (`codex.ts`); verify with a unit test in `apps/daemon/test/agents.test.ts` asserting the exact argv for Claude Code and that Codex's is `null`.

## 3. Daemon: voice-polish feature

- [ ] 3.1 Add `apps/daemon/src/features/voice-polish/service.ts`: `VoicePolishService` (deps: `exec: Executor`, `logger`), method `polish(profile, text)` that returns `{ text, applied: false }` immediately when `agentFor(profile).polish` is `null` or `profile.provider` is set; otherwise runs `ctx.exec(adapter.command, adapter.polish.args(text), { cwd: <os.tmpdir() scratch dir>, env: <CLAUDE_CONFIG_DIR per `isDefaultConfigDir`, mirroring `renderLauncher`>, timeoutMs: 9500 })`, parses the JSON `.result` field, and returns `{ text: result, applied: true }`; any non-zero exit, timeout, empty/unparsable output, or a result equal to the original (after trimming) returns `{ text: original, applied: false }` — never throws. Verify with a unit test using `fakeExecutor` (see `apps/daemon/test/helpers.ts`) covering: success, non-zero exit, timeout, unsupported agent (`polish: null`), and a provider-routed profile.
- [ ] 3.2 Add `apps/daemon/src/features/voice-polish/index.ts`: `registerVoicePolishFeature(ctx, store)` following `features/autocomplete/index.ts`'s `sessionContext(sessionId)` pattern (session → profile via `ctx.profiles`, `not_found` `DaemonError` for an unknown session/profile), registering `voice.polish` → `{ type: 'voice.polish.result', text, applied }`. Wire it in `apps/daemon/src/main.ts` next to `registerAutocompleteFeature`.
- [ ] 3.3 Verify `pnpm --filter @remote-harness/daemon test` passes.

## 4. App: pure logic

- [ ] 4.1 Add `apps/mobile/src/features/voice/segments.ts`: `mergeSegments(segments: string[]): string` (joins trimmed non-empty segments with a single space) and `liveTranscript(segments, interim)` (the same, plus the interim text); verify with `segments.test.ts` covering empty segments, a trailing interim, and multiple segments.
- [ ] 4.2 Extend `apps/mobile/src/features/voice/error-outcome.ts`: add `'interrupted'` to `RecognitionErrorOutcome`, mapped from the `interrupted` error code (distinct from `retry`); verify with a test case in `error-outcome.test.ts`.
- [ ] 4.3 Add `apps/mobile/src/features/voice/review.ts`: `shouldReview(result: { text: string; applied: boolean }, original: string): boolean` — true only when `applied` and the trimmed texts differ; verify with `review.test.ts`.
- [ ] 4.4 Add a `MAX_RECORDING_MS` constant (10 minutes) and a pure `hasReachedMaxDuration(elapsedMs: number): boolean` next to `timer.ts` (or inside it); verify with a test at the boundary (just under / at the cap).

## 5. App: settings stores

- [ ] 5.1 Add `apps/mobile/src/features/voice/voice-polish-store.ts`: a Zustand store + `restoreVoicePolish`/`setVoicePolish` persisted via `expo-secure-store`, mirroring `voice-language-store.ts`; default `false`.
- [ ] 5.2 Add `apps/mobile/src/features/voice/voice-interaction-store.ts`: same shape for "press and hold to record" (push-to-talk), default `false`.

## 6. App: recording hook

- [ ] 6.1 Rework `use-voice-recording.ts`'s state machine: states `idle | recording | paused | transcribing | reviewing | denied | offline-unavailable`; keep an internal segments array (task 4.1); `start`/`resume` call the native `start()` with `continuous: true`, `interimResults: true`, `addsPunctuation: true`; `pause` calls native `stop()` and sets `paused` (keeping segments); a `result` event with `isFinal` appends a segment — only transitioning out of `recording`/`paused` when the user (or max duration) asked to finish, not merely because one native session ended.
- [ ] 6.2 Interim results: track the latest non-final `result` event's text as `interimText`, exposed from the hook; cleared when a segment finalizes.
- [ ] 6.3 Max duration: when accumulated `elapsedMs` reaches `MAX_RECORDING_MS` (task 4.4) while recording, call the same path as a manual stop.
- [ ] 6.4 Classify the `interrupted` error (task 4.2) as a pause: keep segments, set `paused`, do not call `onTranscript` and do not discard.
- [ ] 6.5 Finalizing (`stop`/Done while paused/max duration): flush the last segment, compute the merged transcript (task 4.1); if "Polish dictation" is on (task 5.1) and the session's profile supports it, `transcribing` → request `voice.polish` over the daemon client (new `sessionId` param on the hook) → if `shouldReview` (task 4.3) is true, state becomes `reviewing` with `{ original, polished }`; otherwise call `onTranscript` directly with whatever text applies (polished when applied and not reviewed, else original).
- [ ] 6.6 Add `useOriginal`/`usePolished` actions that resolve the `reviewing` state by calling `onTranscript` with the corresponding text and returning to `idle`.
- [ ] 6.7 Verify with updated/new tests for `use-voice-recording` covering: continuous recording across a non-final result, pause/resume producing a merged transcript, max duration auto-stop, an `interrupted` error pausing instead of discarding, and the review path (`applied: true` + differing text → `reviewing`; everything else → direct `onTranscript`).

## 7. App: UI

- [ ] 7.1 `RecordingOverlay`: show `interimText` while recording; add a `paused` rendering (Resume replaces the level meter row's stop icon, Cancel and Done stay available); add a `reviewing` rendering showing both texts with "Use original" / "Use polished" actions.
- [ ] 7.2 `VoiceButton`: accept a `pushToTalk` prop; when true, use `onPressIn`/`onPressOut` instead of toggle `onPress`, keeping the same disabled/read-only behavior.
- [ ] 7.3 `SmartComposer.tsx`: pass `sessionId` into `useVoiceRecording`, wire the new overlay props (`interimText`, pause/resume, review actions), and read `voice-interaction-store` for the button's `pushToTalk` prop.
- [ ] 7.4 Add the two new Settings rows (Polish dictation, Press and hold to record) — either on `VoiceLanguageCard` or a new adjacent card — restoring their stores on mount like `VoiceLanguageCard` already does.

## 8. i18n

- [ ] 8.1 Add strings for: Pause, Resume, the paused state's hint, the review step's heading and both actions, the "Polish dictation" and "Press and hold to record" settings rows and their hints, to `locales/{en-US,pt-BR,es-ES}.ts`; verify the i18n parity test passes.

## 9. Verification

- [ ] 9.1 Run `pnpm check` (typecheck + Vitest + Biome) green across the whole repo.
- [ ] 9.2 Manually verify in the iOS simulator (if a dev build is available): continuous recording across a pause, pause/resume, push-to-talk, and (with a Claude Code profile) Polish dictation producing a reviewable rewrite.
