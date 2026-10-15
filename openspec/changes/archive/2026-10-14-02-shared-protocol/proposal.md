## Why

The app and the daemon talk over WebSocket. If the messages don't have a single contract validated at runtime, any divergence becomes a silent bug on the phone.

## What Changes

- `@claude-remote/protocol` package with Zod schemas for all client → daemon and daemon → client messages described in the PRD (section 10).
- Common envelope with a request `id`, response correlation (`replyTo`) and typed errors.
- Shared domain types: profile, session, state, permission mode, normalized transcript entry, permission request.
- `parseClientMessage` / `parseServerMessage` functions that never throw.

## Capabilities

### New Capabilities
- `protocol`: contract for the WebSocket messages between app and daemon, and validation rules.

### Modified Capabilities

## Impact

New `packages/protocol` package, `zod` dependency. Consumed by `apps/daemon` and `apps/mobile`.
