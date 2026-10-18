## Context

`SessionStore.upsert` stamps `updatedAt = now` on any effective change and drops patches that change nothing (an `updatedAt`-only patch is a no-op today). Hooks reach the store through `SessionService.handleHook`; transcript entries are read by `TranscriptService.pump` for streams with subscribers (the app) or daemon-side listeners (live status), which already reports meta lines back through an `onMeta` callback. `restore()` rebuilds sessions from persisted pane links with `updatedAt = now`. The app sorts with `compareSessions` (state, then recency) and shows `relativeTime` ("5 min ago").

## Goals / Non-Goals

**Goals:** the list order reflects what the user touched last; a restart does not reorder; streaming output keeps a session on top without re-sorting on every token; the user can switch back to the state order; relative times read like the prototype.

**Non-Goals:** following every session's transcript just to track activity (only streams someone already reads count; hooks cover the rest); the "Waiting for you" strip (#154); syncing the sort preference to the daemon.

## Decisions

- **Touch semantics in the store.** `upsert` treats an explicit `patch.updatedAt` that is newer than the stored one as a change even when nothing else differs, broadcasting `session.updated` as usual. Equal or older stamps are still ignored, so status-line and checkout refreshes (which pass the current stamp) stay silent.
- **Activity source.** `TranscriptService` gains an `onActivity(sessionId, at)` callback, invoked once per `pump` that read at least one line (main stream and subagent streams alike: a subagent's output is the session's activity). `SessionService.noteActivity(sessionId, at)` throttles per session (`ACTIVITY_THROTTLE_MS = 5000`) and touches the store. Hooks keep stamping through their state changes; no extra bookkeeping.
- **Restore.** Pane links persist `updatedAt` (optional in the schema, so older state files still load). `restore()` uses it, else the transcript file's `mtime`, else now. Scan of recent transcripts already uses the file `mtime`.
- **App sort.** `SessionSort = 'recent' | 'state'`, default `recent`, in a Zustand store persisted in SecureStore (`remote-harness.session-sort`), restored at start like the other switches. `listSessions(sessions, filter, sort)` orders by `updatedAt` desc (ties by title) or by the previous comparator. The chip is a ghost `Chip` at the end of the filter row labelled "Recent ▾" / "By state ▾"; with two options a tap toggles.
- **Relative time.** `relativeTime` returns `now` (< 45 s), `N min`, `N h`, `yesterday` (1 day) and `N d`; keys `time.now`, `time.minutes`, `time.hours`, `time.yesterday`, `time.days`. The details sheet keeps "relative · absolute".

## Risks / Trade-offs

- A session streaming output with no subscriber and no live status does not bump until its next hook (Stop); acceptable, since the alternative is tailing every transcript.
- Switching to recency means a `waiting` session can sit below a busier one; the strip in #154 pins it.
