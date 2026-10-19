# 61 · New session screen: agent & profile list, recent details, agent-neutral worktree copy

## Why

The new-session screen still shows profiles as a row of buttons with no agent, directories as bare paths and a worktree hint that names Claude Code. #156 (epic #162) brings it to the identity prototype: a radio list of profiles with the agent badge and `Claude Code · ~/.claude`, recent directories with their branch and weekly usage, an agent-neutral worktree toggle whose shared-checkout warning suggests the worktree, and room for the model row that #109 will fill.

## What Changes

- **Protocol / daemon**: `ProjectItem` gains `branch` (of the latest session in that directory, `null` when unknown) and `sessions` (sessions updated there in the last 7 days). `projects.list` keeps its order and limit.
- **App**: "Agent & profile" is a radio list (agent badge · name in the profile color · `Claude Code · ~/.claude`, the provider appended when it is not the default, once #109 carries it). The Model row is rendered only when the profile's provider lists models (none until #109). Directory keeps the field, Browse and suggestions; Recent rows show `⎇ branch · N sessions this week`. The worktree hint says "The agent works on its own branch…"; the shared-checkout warning lists the sessions and adds "The worktree keeps them apart."; `Start session` stays the primary button.
- Copy in pt-BR, en-US and es-ES.

## Impact

- `packages/protocol/src/domain.ts` (`ProjectItemSchema`).
- `apps/daemon/src/features/lifecycle/service.ts` (`projects`), `test/lifecycle.test.ts`.
- `apps/mobile/src/features/lifecycle/{NewSessionScreen.tsx,new-session.ts,new-session.test.ts}`, locales.
- Specs: `session-lifecycle` (MODIFIED Recent directories, Shared checkout warning on start; ADDED New session screen).
