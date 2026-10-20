## Why

After `/exit`, a session that is already ended and read-only still shows as **waiting**: it stays in the "WAITING FOR YOU" strip with its timer running, and its header badge says `waiting` above the read-only bar (issue #220). The user gets a false "needs you" signal, and possibly a push, for a session that no longer exists.

The daemon applies every hook's state unconditionally, so a hook that arrives after `SessionEnd` revives the session:
- `Notification` → `waiting`;
- `PermissionRequest` → `waiting`;
- `Stop` → `idle`;
- the hook's pane → `controllable: true`.

The `permission.resolved` handler sets `running` even for an ended session (e.g. the request denied on close). And the resume path drops the pane of a session (`controllable: false`) without ending it, so the session stays `waiting`. The `(no content)` line after `/exit` is the placeholder Claude Code writes for an empty command output.

## What Changes

- **Ended is final until a new start.** Once a session is `ended` (`SessionEnd`, pane gone, close, replaced in its pane), no later hook can move it back to `waiting`, `running` or `idle`, or give it a pane. Two things bring it back: a `SessionStart` (resume, `/clear`), or a `UserPromptSubmit` from a tmux pane. The rule is a pure function with tests.
- **A permission resolution** only sets `running` on a session that is not ended.
- **Resume path**: a session whose pane closed is set to `ended`, not only made read-only.
- **Leftovers end with the session**: when a session becomes `ended`, by any path:
  - its pending permission requests are cancelled;
  - its live status ends;
  - late hooks no longer send "waiting" or "done" pushes, or live status updates.
- **App**: the "Waiting for you" strip ignores read-only sessions without a pending request, and requests whose session already ended.
- **Transcript**: the `(no content)` placeholder (empty command output or empty assistant text) is not sent.

## Capabilities

### Modified Capabilities
- `session-registry`: event-driven state (ended is final until a new start).
- `app-session-list`: waiting strip (read-only and ended sessions left out).
- `transcript-stream`: tolerant normalization (`(no content)` dropped).

## Impact

`apps/daemon`:
- `sessions/state.ts`: pure transition rules with tests;
- `sessions/service.ts`, `sessions/index.ts`;
- `lifecycle/service.ts`;
- `permissions/broker.ts`: `cancelAll`;
- live status and push guards;
- `transcript/parser.ts`;
- `main.ts` wiring.

`apps/mobile`: `permissions/strip.ts` with tests.

No protocol change.
