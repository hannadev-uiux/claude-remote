## 1. Protocol

- [x] 1.1 Add the optional `trigger` field to the `system` variant of `TranscriptEntrySchema` in `packages/protocol/src/domain.ts`, documented as `compact_boundary`-only, and verify `pnpm --filter @remote-harness/protocol build` (or the workspace typecheck) passes.

## 2. Daemon parser

- [x] 2.1 In `apps/daemon/src/features/transcript/parser.ts`, make `parseUser` recognize `line.isCompactSummary === true` before falling through to `userDrafts`, and emit a `{ kind: 'system', subtype: 'compact_summary', text }` draft with the trailing boilerplate stripped (cut at the first occurrence of the "If you need specific details from before compaction" marker; keep the full text when the marker is absent).
- [x] 2.2 In `parseSystem`'s `compact_boundary` branch, read `line.compactMetadata?.trigger` (string) and include it as `trigger` on the returned draft when present.
- [x] 2.3 Add Vitest fixtures/cases (synthetic content, no real paths or names) for: a compaction summary with the full boilerplate, one without the marker (kept whole), a `compact_boundary` with a known trigger, and one with no trigger. Verify `pnpm --filter @remote-harness/daemon test` passes.

## 3. App rendering

- [x] 3.1 In `apps/mobile/src/features/conversation/timeline.ts`, pass `trigger` through `buildTimeline`'s system-entry mapping into `TimelineItem`, and extend `systemText`'s `compact_boundary` case to append a translated qualifier when `trigger` is `manual` or `auto`, falling back to the plain compacted text otherwise.
- [x] 3.2 Add a `CompactSummary` component in `apps/mobile/src/features/conversation/components/Messages.tsx` (collapsed card labeled as a compaction summary, same collapsed/expand pattern as `TaskNotification`/`TaggedEntry`; expanded body uses `Markdown` and the existing `CopyButton`).
- [x] 3.3 Dispatch the `compact_summary` subtype to the new component in `apps/mobile/src/features/conversation/ConversationScreen.tsx`.
- [x] 3.4 Add the new strings (card label, trigger qualifiers) to `apps/mobile/src/core/i18n/locales/{pt-BR,en-US,es-ES}.ts` and verify the i18n parity test (`apps/mobile/src/core/i18n/i18n.test.ts`) passes.
- [x] 3.5 Add/extend unit tests for `systemText`'s trigger qualifier in `apps/mobile/src/features/conversation/timeline.test.ts` (or equivalent), and verify `pnpm --filter @remote-harness/mobile test` passes.

## 4. Validation

- [x] 4.1 Run `pnpm check` at the repo root and confirm it is green (typecheck, tests, Biome).
