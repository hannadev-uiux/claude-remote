## Context

`NewSessionScreen` offers the profiles as compact buttons, a directory field with Browse and suggestions, the branch line, the shared-checkout warning card, the worktree switch, the start button and a Recent list (`projects.list`: `cwd`, `lastUsedAt`). `LifecycleService.projects` folds the profile's sessions by `cwd`. The prototype `new-session.html` fixes the layout and copy; #108 (agents) and #109 (providers, model picker) land later and must slot in.

## Decisions

- **Recent details come from the daemon.** The sessions it already holds carry `checkout` and `updatedAt`, so `projects()` adds `branch` (from the most recent session in that directory) and `sessions` (updated in the last 7 days, using the service's injected clock). Older daemons leave both at their defaults and the row shows only the path.
- **Profile rows are pure.** `profileAgent(profile)` returns `claude` until #108 carries the agent; `profileDetail(profile, provider)` builds `Claude Code · ~/.claude` and appends the provider when #109 supplies one; `recentDetail(item, t)` builds `⎇ main · 2 sessions this week`. All three are tested.
- **Seams, not placeholders.** The Model row is a section the screen renders only when it has models for the selected profile; with no data (until #109) it is absent, but the section order (Agent & profile → Model → Directory → Recent → worktree → Start) is fixed now.
- **Agent-neutral copy.** The worktree hint and the shared-checkout warning stop naming Claude Code; the warning gains the suggestion from the prototype ("The worktree keeps them apart.").
- The start flow (inspection, confirmation, timeout, single tap) is unchanged.
