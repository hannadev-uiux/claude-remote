## ADDED Requirements

### Requirement: Compaction entries
A `user` transcript line flagged `isCompactSummary` SHALL become a `system` entry with subtype `compact_summary` instead of a `user` entry, never shown as a user prompt and never offered in prompt history. The boilerplate written for the model at the end of that text (the "read the full transcript at `<path>`" sentence and the instruction to continue without acknowledging the summary) MUST NOT appear in the entry's text; when that boilerplate is not found, the full text SHALL be kept rather than discarded. A `compact_boundary` system entry SHALL carry the compaction trigger (`compactMetadata.trigger`, e.g. `manual` or `auto`) in an optional `trigger` field when Claude Code reports one.

#### Scenario: Manual or automatic compaction summary
- **WHEN** a `user` line has `isCompactSummary: true` and its content is "This session is being continued from a previous conversation...\n\nSummary:\n1. ...\n\nIf you need specific details from before compaction (like exact code snippets, error messages, or content you generated), read the full transcript at: /some/path.jsonl\nContinue the conversation from where it left off..."
- **THEN** a `compact_summary` system entry is sent with the "Summary: 1. ..." portion as its text, and neither the transcript path nor the "Continue the conversation..." instruction appears in it

#### Scenario: Boilerplate not found
- **WHEN** a `user` line has `isCompactSummary: true` and its content does not contain the "read the full transcript at" marker
- **THEN** a `compact_summary` system entry is sent with the full content as its text

#### Scenario: Known compaction trigger
- **WHEN** a `compact_boundary` system line has `compactMetadata: { trigger: "auto" }`
- **THEN** the `compact_boundary` entry is sent with `trigger: "auto"`

#### Scenario: Unknown or missing trigger
- **WHEN** a `compact_boundary` system line has no `compactMetadata.trigger`
- **THEN** the `compact_boundary` entry is sent without a `trigger` field
