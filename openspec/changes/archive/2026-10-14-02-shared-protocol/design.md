## Context

See proposal.md. The PRD (section 10) contains a sketch; here it becomes a contract.

## Goals / Non-Goals

**Goals:** a single place with schemas and inferred types (`z.infer`), used by both sides.

**Non-Goals:** code generation, versioning with multiple active versions.

## Decisions

- **Zod 4** with `z.discriminatedUnion("type", ...)`: type inference and runtime validation. Alternatives: Valibot (smaller bundle, smaller ecosystem) and TypeBox.
- **Non-strict objects with strip**: tolerates new fields (tolerance requirement).
- **Normalized transcript entry** (`TranscriptEntry`): `kind` in `user | assistant_text | thinking | tool_use | tool_result | system | unknown`, with `uuid`, `timestamp`, `isSidechain`, `agentId?` and a kind-specific payload. The raw `.jsonl` format never reaches the app.
- **Cursor**: the line number in the `.jsonl` file (`cursor` increasing per session), enough to resume.
- Constant `PROTOCOL_VERSION = 1`.

## Risks / Trade-offs

- [Large schemas in a single file] → split into `domain.ts`, `client.ts`, `server.ts`.
