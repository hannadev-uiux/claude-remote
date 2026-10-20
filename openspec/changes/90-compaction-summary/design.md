## Context

See proposal.md for motivation. Two transcript lines are involved, always adjacent and in this order: a `system`/`compact_boundary` line (`compactMetadata.trigger`, observed value `"auto"`; `/compact` is expected to report `"manual"`, not yet observed in a real transcript) and, immediately after, a `user` line with `isCompactSummary: true`, `isVisibleInTranscriptOnly: true`, and `message.content` as a plain string (not the array shape regular prompts use). `apps/daemon/src/features/transcript/parser.ts` is the only module allowed to know this format (CLAUDE.md).

## Goals / Non-Goals

**Goals:**
- Never show the compaction summary as a user prompt.
- Keep the daemon stateless per line: no cross-line lookback is needed because the two entries are independent, order-preserving system entries the app already renders in sequence.
- Fail safe: an unrecognized shape never throws and never drops content silently.

**Non-Goals:**
- Reconstructing the exact idle-compaction trigger label ("Compacted while idle, before the prompt cache expired"). No real transcript with that trigger value was found; the design treats `trigger` as an opaque string from `compactMetadata.trigger` and only labels the two confirmed shapes (`manual`, `auto`). Any other value (including a future idle-specific one) falls back to the plain "Conversation compacted" text rather than guessing a label.

## Decisions

- **Stateless recognition via a line-local flag, not a parser-level pairing.** The `compact_boundary` and `compact_summary` entries are produced independently from their own lines; the app relies on normal transcript ordering to render them adjacent, exactly as it already does for any two consecutive entries. Alternative considered: have the parser carry the trigger from the boundary line onto the summary entry. Rejected — it would require mutable state across `parseTranscriptLine` calls, which every other recognizer in this file avoids, for a cosmetic grouping the app gets for free from entry order.
- **Boilerplate stripping by marker, not by exact string match.** Cut the text at the first occurrence of the line `"If you need specific details from before compaction"` (stable across the one real sample found) through the end. Alternative considered: regex the whole known boilerplate verbatim. Rejected — brittle against minor wording changes in a future Claude Code version; a missing marker must degrade to "show everything," never to losing the summary.
- **`trigger` as a new optional field on the existing generic `system` variant**, not a new TranscriptEntry kind. Consistent with `durationMs`/`status`/`note`/`tag`, which are already subtype-specific optional fields on the same variant; adding a discriminated union branch per subtype would be a much larger, unrelated refactor.

## Risks / Trade-offs

- [Only one real trigger value (`auto`) was available to test against] → Mitigation: fixtures cover the observed shape and an unknown/missing trigger; the label mapping is a small pure function, easy to extend with a one-line change and a new test if `manual` or another value turns out to need different wording than assumed.
- [Stripping by marker could leave boilerplate in if Claude Code rewords it] → Mitigation: the fallback is to show the full text, which is the current (bad) behavior for everyone today — so this change can only improve the common case, never regress a line that already showed raw text.

## Open Questions

- Exact wording Claude Code uses for the `trigger` value of a manual `/compact` and of idle compaction, and whether idle compaction is in fact a distinct `trigger` value rather than `"auto"` with no further distinction. Does not block this change: the trigger label mapping only needs a values table, with an already-defensive fallback for anything not in it.
