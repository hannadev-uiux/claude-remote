## Context

`LifecycleService.start()` (`apps/daemon/src/features/lifecycle/service.ts`) launches the profile's launcher, optionally waits `START_SETTLE_MS` (1.5 s) and confirms the pane is still alive (`hasPane`), then returns `{ paneId }`. The session itself is created separately, in the `SessionStore`, when the pane's `SessionStart` hook arrives (see `session-registry`'s "Event-driven state" requirement) — the hook's handler calls `store.upsert(sessionId, { paneId, ... })`. There is today no code path that connects "the pane `start()` just launched" to "the session that later registers against it" other than the session list eventually showing a new row with that `paneId`. `SessionStore.findByPane(paneId)` already exists and is the lookup this change needs; `SessionStore.onChange(listener)` already fires on every upsert, including the one the hook triggers, and is the hook into "a session just registered" without polling.

On the client, `NewSessionScreen` (`apps/mobile/src/features/lifecycle/`) calls `session.start` and ignores the reply payload (`router.back()` on success). The session route (`app/(main)/session/[id]/index.tsx`) already renders correctly from an id alone, pulling the rest from `useSessionsStore`; navigating to it before the store has that session just renders blank-ish until `session.updated` arrives (which happens over the same connection, essentially immediately). Per-device toggles (push, live status, theme) already follow one pattern: a tiny zustand store plus a `restoreXSettings()` read from `expo-secure-store` at app start, called from the same place `restorePushSettings()`/`restoreThemePreference()` are.

## Goals / Non-Goals

**Goals:**
- Land the user in the new session, composer focused, in the common case without any visible delay.
- Degrade gracefully when the `SessionStart` hook is slow: show progress instead of blocking the reply or guessing.
- Keep `session.resume` and every other reply untouched.

**Non-Goals:**
- No change to the `SessionStart` hook, the agent launchers, or how sessions are persisted.
- No retry/giveup UX for the rare case where the hook never fires at all (e.g. the agent is misconfigured) — the existing dead-pane detection (session-registry's 5 s sweep) and the user backing out manually already cover it; this change does not add a second failure path for the same problem.
- No change to how the session list / detail pane choose what to render on tablets — `router.replace` into `/session/[id]` already drives that correctly for `session.resume` today, and this change relies on the same mechanism rather than re-implementing it.

## Decisions

**A dedicated `session.started` reply instead of overloading `ack`.** `session.start`'s reply today is a generic `ack` with an untyped `data: Record<string, unknown>` that no client code actually reads. Every other request that returns specific data (`worktree.inspect` → `worktree.info`, `directories.list` → `directories.results`) uses a typed message instead. Doing the same here gets `sessionId`/`paneId` validated by the shared Zod schema rather than cast out of an untyped record. Alternative considered: keep `ack` and add `sessionId` to its `data` record — rejected, since it keeps the client casting `unknown` for a value the protocol can type exactly.

**The daemon waits, bounded, inside `start()` rather than the app polling `sessions.list`.** The daemon already knows the exact `paneId` to watch for and already has `SessionStore.onChange`; waiting there means `sessionId` is usually already known by the time the reply reaches the app (hook latency is typically well under a second), so the common case needs no placeholder UI at all. Alternative considered: have the app poll or wait on `session.updated` itself after an immediate `ack` — rejected, it pushes timing logic (and a second timeout) onto every client of this message instead of once in the daemon, and makes the fast path (session already registered) pay a round trip it does not need to.

**Wait is implemented as an injected function, not a raw `setTimeout` in `LifecycleService`.** Mirrors the existing `hasPane`/`checkout` constructor params: a `waitForSession(paneId, timeoutMs) => Promise<string | null>` collaborator, real implementation wired in `features/lifecycle/index.ts` against the shared `SessionStore` (check `findByPane` first for the already-registered case, else race a one-shot `onChange` listener against a timer), test implementation a plain stub. Keeps `LifecycleService` unit-testable without fake timers driving a real store.

**Timeout values**: reuse the existing `START_SETTLE_MS` (1.5 s) unchanged for the "pane survived" check, then budget a further bounded wait (a few seconds) for session registration before answering with `sessionId: null`. The exact number is an implementation constant (`tasks.md`), not a spec-level guarantee — the spec only commits to "bounded" and to `session.started` never carrying a wrong `sessionId`.

**App-side fallback stays on the New Session screen instead of a new route.** When `sessionId` is `null`, the screen keeps its existing `busy`/progress UI (relabeled to name the agent and directory) and adds one subscription to `useSessionsStore` for a session whose `paneId` matches the launched one; finding it triggers the same `router.replace` the fast path uses. This avoids adding a placeholder screen/route whose only job is to redirect itself away. Alternative considered: a dedicated `/session/starting` route bound to a `paneId` query param — rejected as an extra screen and an extra piece of navigation state for a transition that, per the daemon-side wait, is expected to be rare and short.

**Composer focus via a query param, not global state.** `router.replace({ pathname: '/session/[id]', params: { id, autofocus: '1' } })`; the session route reads `autofocus` from `useLocalSearchParams` and passes it down to `SmartComposer`, which calls its existing `input.current?.focus()` once, on mount, when set. Scoped to the one navigation that asked for it; no new store.

**Setting storage**: a new `apps/mobile/src/features/lifecycle/open-after-create-store.ts`, byte-for-byte the same shape as `push-settings-store.ts` (zustand + `expo-secure-store`, `enabled: true` default). Surfaced as a new "New session" card in Settings (one `ToggleRow`, the same component `NotificationsCard` already uses), between **Profiles** and **Notifications**.

## Risks / Trade-offs

- [`session.started` is a breaking reply-shape change for `session.start`] → Acceptable: the only client is this repo's app, shipped together with the daemon change in the same change/PR; no external integrators exist.
- [The daemon waiting inside `start()` adds latency to `session.start` itself when the hook is slow] → Bounded by the timeout; the reply was never instant before (it already waits `START_SETTLE_MS`), and a slow hook today just means the app's old `router.back()` left the user to notice the new row later — this change is strictly not worse, and is better whenever the hook keeps up.
- [Matching by `paneId` on the client could race if a user manages to start two sessions whose panes momentarily share a transient id] → Not possible in practice: `paneId` is tmux's own pane identifier and unique per live pane; the lookup only runs against the single `paneId` this launch returned.

## Migration Plan

Single change, implemented and shipped together (protocol → daemon → app, per CLAUDE.md's ordering): add `session.started` to the protocol, switch the daemon's `session.start` handler to answer it, update the app's `NewSessionScreen` and `SmartComposer`, add the setting. No data migration; the new per-device setting defaults to "on" so existing installs get the new behavior immediately, and nothing is persisted that needs backfilling.
