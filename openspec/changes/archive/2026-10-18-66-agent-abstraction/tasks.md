## 1. Protocol and daemon

- [x] 1.1 `AgentIdSchema`; optional `agent` on `Profile` and `Session` (fixtures)
- [x] 1.2 `features/agents/` with `AgentAdapter`, the Claude Code adapter, `agentFor`, `profileAgentId`, `hasAgentAdapter`; lifecycle resume / worktree args and the recent-transcript scanner through the adapter; session records stamped with the profile's agent; `resolveProfiles` drops profiles without an adapter; tests

## 2. App

- [x] 2.1 `sessionAgent` and `profileAgent` read the field (Claude Code when absent); tests

## 3. Verification

- [x] 3.1 `pnpm check` green; `npx expo export --platform ios` bundles
