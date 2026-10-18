## Why

The session list still has the first layout: a "Remote Harness" title, a search box, button-like filters, sessions grouped under profile headers, and rows with a title, folder, badges and a chevron. The redesign (#153) gives it the product header (the mark + "Sessions"), a machine line, filter chips instead of profile groups, and a denser row that tells the agent, the profile, the state and the recency at a glance, in every theme.

## What Changes

- **Header**: the mark (22 pt, accent) + "Sessions", with `+` and settings on the right, both in the compact stack header and in the iPad sidebar header. The product name is no longer repeated (it is under the icon).
- **Machine line** under the header: connection dot (success / warning / danger), the machine name (#94), the number of sessions in the list and the number of distinct agents (hidden while none is known).
- **Filter chips**: `all` + one chip per profile replace the profile group headers (the list becomes one flat list); `active` / `ended` stay as chips after a divider; the search box stays below the chips. The sort chip arrives with #104.
- **Row**: agent badge (20 pt rounded square in the agent's fixed color with its two-letter code) · title · relative time; folder · `⎇ branch` · `⌂ worktree` (sessions under `.claude/worktrees`) · "shared checkout (N)" in the warning color; state pill · pending-permission badge · `read-only` plain pill · profile tag (name in the profile color) · muted glyph · `+N subagents` plain pill · background-tasks pill · chevron. The waiting row keeps the warning border; the selected row (iPad) the accent border. The agent color never changes with the state.
- **State pills**: running = accent, waiting = warning, idle = success, ended = muted (as the `Badge` tones already are).
- **New design-system pieces**: `Mark` (the Tether drawn with `react-native-svg`, regular/bold), `AgentBadge`, `ProfileTag`, `Chip`.
- **Agent of a session**: until the protocol carries it (#108), every session the daemon lists is Claude Code, so `sessionAgent()` returns `claude` (the badge shows `cl`); the generic copy from #87 is unchanged.
- Pure helpers with tests: `listSessions` (filter + order, flat), `listSummary` (counts), `isWorktreePath`, agent codes. `ProfileHeader` and the grouping module are removed.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-session-list`: grouping by profile is replaced by the flat list with filter chips; new requirements for the header, the machine line and the row anatomy; the shared-checkout warning moves into the path line.

## Impact

- `apps/mobile`: `src/ui/{Mark,AgentBadge,ProfileTag,Chip}.tsx`, `features/sessions/{filter,summary}.ts` (+ tests) replacing `grouping.ts`, `components/{SessionRow,ListTitle,MachineLine}.tsx`, `SessionsScreen.tsx`, `(main)/_layout.tsx` (header title and sidebar), `core/theme/agents.ts` (codes, badge ink), `features/sessions/agent.ts`, the three catalogs (`sessions.title`, counts, worktree, subagents, muted).
- No protocol or daemon change.
