## 1. Core

- [x] 1.1 Implement `PermissionBroker` (pending map, timeout, single response, cancellation); verify with tests for allow, deny, timeout, duplicate and cancellation
- [x] 1.2 Implement generation of the suggested rule; verify with tests for Bash, Edit and MCP
- [x] 1.3 Implement building the hook output with `updatedPermissions`; verify with a test of the exact JSON

## 2. Integration

- [x] 2.1 Wire the `PermissionRequest` route to the broker and the `permission.respond` handlers; verify with an HTTP hook + WS integration test
- [x] 2.2 Implement `rules-log.jsonl` and `claude-remote rules list|undo`; verify with a test in a temporary directory
