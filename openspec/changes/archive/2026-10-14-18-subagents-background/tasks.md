## 1. Daemon

- [x] 1.1 Extend the protocol with `SubagentInfo`, `agentId` in subscribe and `backgroundTasks` on `Session`; verify with parse tests
- [x] 1.2 Implement `SubagentTracker` (watcher + SubagentStop + inactivity timeout) and capture of `background_tasks`; verify with tests in a temporary directory
- [x] 1.3 Allow subscribing to a subagent transcript; verify with a WS test

## 2. App

- [x] 2.1 Show nested subagents and the background badge in the list, and a section on the session screen; verify with typecheck
- [x] 2.2 Open the subagent transcript in read-only mode; verify with `expo export`
