## 1. Design system

- [x] 1.1 `Mark` (react-native-svg, regular/bold), `AgentBadge`, `ProfileTag`, `Chip` in `src/ui`; agent codes and badge ink in `core/theme/agents.ts`

## 2. List

- [x] 2.1 `filter.ts` (`listSessions`, flat) and `summary.ts` (`listSummary`, `isWorktreePath`) with tests; `grouping.ts` and `ProfileHeader` removed; `sessionAgent()` returns `claude`
- [x] 2.2 `ListTitle` in the stack header and the sidebar; `MachineLine`; chips (all, profiles, active/ended) and search in `SessionsScreen`
- [x] 2.3 `SessionRow`: badge · title · time; folder · branch · worktree · shared checkout; pills, profile tag, muted glyph, subagents, chevron
- [x] 2.4 i18n: `sessions.title`, `count`, `agents`, `worktree`, `subagents`, `muted` in pt-BR, en-US, es-ES

## 3. Verification

- [x] 3.1 `pnpm check` green (turbo typecheck + tests 10/10; Biome on `apps packages`); `npx expo export --platform ios` bundles
