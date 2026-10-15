## Context

Messages from changes 08 and 09.

## Goals / Non-Goals

**Goals:** respond with a single tap and without ambiguity.

**Non-Goals:** actions in the notification (change 19).

## Decisions

- **Global permissions store** (`Map<requestId, PermissionRequest>`) so the list and the session read the same state.
- **Simple `BottomSheet`** with a native `Modal` (`presentationStyle="pageSheet"`) for the confirmation; avoids an extra dependency.
- **`describePermission`**, pure: extracts title/detail per tool (reuses `summarizeTool`).
- **Haptics**: `notificationAsync(Warning)` when a request arrives while the session is open.

## Risks / Trade-offs

- [Request expires while the user decides] → visible countdown; a late response gets `already_resolved`, which is shown.
