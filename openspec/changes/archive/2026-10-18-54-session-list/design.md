## Context

`SessionsScreen` builds `flattenSections(groupSessions(...))` (profile header rows + session rows) for a `FlashList`, with `Button`-styled filters and a search box; `SessionRow` shows title, folder/branch, badges and the relative time. The compact header is the native stack header titled "Remote Harness" with `SessionListActions`; on iPad the sidebar repeats the name. The prototype (`screens/sessions-list.html`, `shared.css`: `.ah`, `.mline`, `.chip`, `.srow`, `.agent`, `.pill`, `.ptag`) fixes the new anatomy. #94 gives `useMachineName()`; #152 gives the tokens and the agent colors; #87 gives `sessionAgent()`.

## Goals / Non-Goals

**Goals:** the prototype's header, machine line, chips and row, themed; one flat list; pure, tested helpers for filtering, counts and the worktree hint; design-system pieces reusable by the next screens (`AgentBadge`, `ProfileTag`, `Chip`, `Mark`).

**Non-Goals:** recency sort and the sort chip (#104); the "Waiting for you" strip (#154); swipe actions (#106); the subagents sheet (#107); the real agent field (#108); removing the nested subagent rows (kept as today).

## Decisions

- **Flat list.** `listSessions(sessions, filter)` filters and sorts (same comparator as today: waiting, running, idle, ended, newest first inside each state; #104 replaces it with recency) and the `FlashList` data is `Session[]`. Profile groups become the chips; `ProfileHeader` and `grouping.ts` go away (`filter.ts` keeps `SessionFilter`, `matchesFilter`, `normalizeSearch`, `isFiltering`, `compareSessions`).
- **Chips.** `Chip` = 6×10 padding, radius 10, `border` + `surface`; selected = `accent` fill with `accentInk` bold text; `ghost` variant (dashed, muted) reserved for the sort chip. Profile chips appear only with more than one profile, as before; `active`/`ended` follow after a divider so the state filter is not lost.
- **Header.** `ListTitle` (Mark 22 + "Sessions") is the stack `headerTitle` in compact width and the sidebar title on iPad; `SessionListActions` stays on the right. `Mark` draws the Tether with `react-native-svg` from the same 256-unit geometry as the icons script, bold under 24 pt, `accentText` by default.
- **Machine line.** `MachineLine` reads the connection status (dot: open = success, unauthorized = danger, otherwise warning), `useMachineName()` (generic fallback), and `listSummary(items)` for "N sessions" and "N agents" (agents hidden when zero). Counts follow the filtered list so the line describes what is on screen.
- **Row.** Three lines as in the prototype. The `+N subagents` pill is added to the meta line while the nested rows under the row stay (their removal is out of scope). Shared checkout moves from a badge to warning-colored text in the path line; the pending-permission badge stays until #154 moves it into the strip. The muted glyph (`BellOff`, dim) shows when the session or its profile is muted. The row receives `profile` and `muted` from the screen (looked up once per render, not per row).
- **Agent of a session.** `sessionAgent()` now returns `'claude'`: the daemon only lists Claude Code sessions, and the badge needs an identity. Call sites that address the agent in copy (#87) still pass the generic label because they have no session at hand; #108 wires real values everywhere.
- **Agent badge ink.** `AGENT_BADGE_INK = '#0D0D0D'` lives next to the agent colors (fixed across themes, like them), so the hex guard stays clean.
- **Worktree hint.** `isWorktreePath(cwd)` matches `.claude/worktrees/` in the path (where Claude Code's `--worktree` and the app's isolated copy live). It is a hint, not a guarantee.

## Risks / Trade-offs

- Without profile headers, a single-profile user sees no change in information; multi-profile users rely on the profile tag and the chips.
- The nested subagent rows plus the `+N subagents` pill duplicate the count until #107 reworks subagent access; accepted to keep both issues' scopes.
