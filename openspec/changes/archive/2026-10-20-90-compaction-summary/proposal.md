## Why

After Claude Code compacts a conversation (`/compact`, automatic compaction when the context fills up, or idle compaction), it writes the summary as a plain `user` transcript line (flagged `isCompactSummary: true`, `isVisibleInTranscriptOnly: true`). The daemon's parser does not special-case that flag, so the line falls through the normal user-text classification and reaches the app as an ordinary prompt. The app then renders it as a huge `>` user bubble: raw, unformatted text that ends with the absolute path of the previous transcript file and instructions written for the model, not for a person. It buries the real conversation and looks like something the user typed.

## What Changes

- `transcript/parser.ts` (the only module that knows the `.jsonl` format) recognizes a `user` line with `isCompactSummary: true` and emits a `system` entry (subtype `compact_summary`) instead of a `user` entry. The trailing boilerplate written for the model (the "read the full transcript at `<path>`" sentence and the "continue from where it left off" instruction) is stripped from the text shown by default; if that boilerplate is not found (format changed), the full text is kept rather than discarding content.
- The existing `compact_boundary` system entry also carries `compactMetadata.trigger` (e.g. `manual`, `auto`) as a new optional `trigger` field, so the app can qualify the "Conversation compacted" line when the trigger is known, instead of discarding it as today.
- The app renders `compact_summary` as a collapsed card right after the "Conversation compacted" line (which already precedes it in the transcript), expandable on tap; the expanded body renders as markdown and offers the existing quick-copy action. It is never shown as a user prompt and never offered in prompt history.
- `TranscriptEntrySchema`'s `system` variant gains the optional `trigger` field (`compact_boundary` only); `compact_summary` reuses the existing `subtype`/`text` fields, no new field needed.

## Capabilities

### New Capabilities

### Modified Capabilities
- `transcript-stream`: the parser's tolerant normalization also recognizes `isCompactSummary` user lines as a `compact_summary` system entry, and `compact_boundary` carries the compaction trigger when Claude Code reports one.
- `app-conversation`: the conversation screen renders `compact_summary` as a collapsed, expandable markdown card instead of a user prompt, and shows the compaction trigger on the "Conversation compacted" line when known.

## Impact

- `apps/daemon/src/features/transcript/parser.ts`: new recognition branch in `parseUser`, and `trigger` passthrough in `parseSystem`'s `compact_boundary` branch.
- `packages/protocol/src/domain.ts`: `TranscriptEntrySchema`'s `system` variant gains the optional `trigger` field.
- `apps/mobile/src/features/conversation/timeline.ts`: maps the new subtype into a `TimelineItem`, and extends `systemText`'s `compact_boundary` label with the trigger when present.
- `apps/mobile/src/features/conversation/components/Messages.tsx`: new `CompactSummary` component (collapsed card, markdown on expand, copy action).
- `apps/mobile/src/features/conversation/ConversationScreen.tsx`: dispatches `compact_summary` to the new component.
- `apps/mobile/src/core/i18n/locales/{pt-BR,en-US,es-ES}.ts`: new strings for the card label and the trigger qualifiers, with parity tests.
- No protocol breaking change: `trigger` is optional and additive; older daemons simply omit it.
