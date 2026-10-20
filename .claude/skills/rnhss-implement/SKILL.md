---
name: rnhss-implement
description: Use when the user asks to implement one or more maarkN/remote-harness GitHub issues by number, start to finish — assignment through a merged PR and an updated board card.
---

# rnhss-implement

Implements one or more `maarkN/remote-harness` issues end to end, one at a time, through this repo's full OpenSpec → PR → board cycle. Grounded in a real run of this exact flow across four issues in one session — the Gotchas section below is what actually went wrong, not a guess.

## Usage

Invoked with one or more issue numbers, e.g. `/rnhss-implement 227 230 232 233` (space- or comma-separated, any order — implement in the order given). Default repo is `maarkN/remote-harness`; ask only if the user clearly means a different one.

## Before starting

1. You cannot trigger a session rename yourself (no tool does it). Tell the user to run `/rename RHNSS - <issue numbers space-separated> implementation` — then keep going without waiting for them to.
2. `gh issue view <N> --repo maarkN/remote-harness --json number,title,body,state,labels` for every issue first, to understand real scope before touching anything.
3. Assign every issue now: `gh issue edit <N> --repo maarkN/remote-harness --add-assignee hannadev-uiux`.
4. Skim each issue's "Notes"/"Related" for a referenced issue that's still open — see the last Gotcha before assuming you must implement that dependency too.

## Per-issue loop (one at a time, in the given order)

1. **Sync and branch.** `git fetch upstream development`, then `git checkout -b feat/<N>-<slug> upstream/development` — never branch from the worktree's current HEAD (see Gotchas). If a branch for this issue already exists (a prior partial run), `git rebase upstream/development` on it instead of recreating it.
2. **Board → In Progress** (see Reference below).
3. **OpenSpec propose.** Find the next free number by checking the *real* `upstream/development`, both `openspec/changes/` and `openspec/changes/archive/` (not this worktree's copy — it can be stale): `git ls-tree upstream/development openspec/changes/` and `.../archive/`, take the highest `NNN` anywhere, use `NNN+1`. Scaffold `openspec/changes/<today>-<NNN>-<slug>/{proposal.md,tasks.md,specs/<capability>/spec.md}` by hand: proposal has Why / What Changes / Capabilities / Impact; the spec delta (`## ADDED Requirements` or `## MODIFIED Requirements`) is written against the *actual current* `openspec/specs/<capability>/spec.md` — read it first, don't assume its wording. `openspec validate <slug> --strict` before writing any code.
4. **Implement** the proposal's own task list. Grep for existing helpers/constants before adding new ones. When the issue's scope bumps into something genuinely out of scope (a dependency on another open issue, a redesign of something unrelated), narrow it and say so explicitly in the proposal and later the PR — don't silently expand to cover it.
5. **Validate** — all of these, not a subset:
   - `pnpm turbo run typecheck test` (from the repo root; not per-package `pnpm check`)
   - `npx biome check --error-on-warnings apps packages openspec` (not bare `biome check .` — see Gotchas)
   - `openspec validate <slug> --strict`
   - Mobile UI touched: `cd apps/mobile && npx expo export --platform ios` (catches Metro-resolution issues `tsc`/`vitest` miss)
   - Native config touched (new config plugin, permissions, alternate icons, anything that changes what `expo prebuild` generates): also `npx expo prebuild --platform all --no-install` from `apps/mobile`, inspect the real generated `ios/`/`android/` output for what you expect, then `rm -rf ios android` (gitignored scratch; this project doesn't commit native dirs)
6. **Fix** whatever validate found; rerun step 5 until clean.
7. **Commit.** One Conventional Commit (`feat(scope): ...`, body explains the why, blank line, then `Closes #<N>`). If you made interim/WIP commits while iterating, squash them into this one first (`git reset --soft upstream/development`, restage, recommit) — this repo's history is one commit per change.
8. **Archive.** `openspec archive <slug> -y`, then a separate `docs(openspec): archive change <slug>` commit for the move.
9. **Push and open the PR.** `git push upstream feat/<N>-<slug>`; `gh pr create --repo maarkN/remote-harness --base development --head feat/<N>-<slug>` with a `## Test plan` checklist of what you actually ran — check only boxes you really verified, leave others unchecked with a one-line reason (e.g. no simulator here) — and `Closes #<N>` in the body.
10. **Wait for CI, then merge.** `gh pr checks <PR> --repo maarkN/remote-harness --watch --interval 15` in the background (don't poll by hand); once green, `gh pr merge <PR> --repo maarkN/remote-harness --merge --delete-branch`.
11. **Close the issue by hand.** Merging into `development` does *not* auto-close it — GitHub only auto-closes on the repo's default branch, which is `main` here. `gh issue comment <N> --repo maarkN/remote-harness --body "Fixed by #<PR>."`, then `gh issue close <N> --repo maarkN/remote-harness`.
12. **Board → Done.**
13. One line to the user — issue, PR number, one-sentence summary — then start the next issue.

## Reference: the Remote Harness project board

- Project id `PVT_kwHOAovCEM4BnOVa` (board #7, "Remote Harness"); Status field id `PVTSSF_lAHOAovCEM4BnOVazhlz7VQ`
- Status options: Backlog `ce502f9b` · Ready `4c5117d4` · In Progress `48963d4a` · In Review `c0b43e25` · Done `aeebd4af` · Blocked `2d9eb3df`
- Get an issue's item id: `gh project item-list 7 --owner maarkN --format json --limit 500`, match `content.number`
- Move a card: `gh project item-edit --id <item-id> --field-id PVTSSF_lAHOAovCEM4BnOVazhlz7VQ --project-id PVT_kwHOAovCEM4BnOVa --single-select-option-id <option-id>`
- A permissions error on `item-add`/`item-edit` despite repo push access is a separate Projects-v2 collaborator grant, not a code bug — tell the user rather than guessing around it.

## Gotchas (hit these for real, in order — don't rediscover them)

- **Worktree staleness.** A session's worktree can be hundreds of commits behind `upstream/development`. Always branch from `upstream/development` right after fetching it, never from the worktree's current HEAD.
- **Biome from inside a worktree.** Root `pnpm check`'s `biome check .` always fails under `.claude/worktrees/*` — the worktree's own absolute path matches the root `.gitignore`'s `.claude/worktrees/` pattern, so Biome refuses the bare `.` argument. Use `npx biome check --error-on-warnings apps packages openspec` directly; it gives the real result.
- **OpenSpec change numbers can collide under concurrent work.** Another session or PR can claim the same next number between your check and your push. If it happens anyway (same `NNN`, different slug, both end up archived), it's cosmetic — leave it; only rename if your change is still local and unpushed.
- **A concurrent merge can redesign something you're about to extend.** Before finishing a UI-facing change, `git fetch upstream development` and skim the newest commits for anything that redesigns a component or pattern you're reusing. Match the new convention; don't ship the one that was just replaced.
- **Vitest can't parse React Native's own source (Flow syntax).** A "pure logic" module you want unit-tested must import from leaf files (e.g. `@/core/theme/palettes`), never the `@/core/theme` barrel — it re-exports `ThemeProvider`, which pulls in `react-native`.
- **Say what you couldn't verify.** No simulator or device is available here. Prefer techniques that verify real risk anyway (`expo export`, `expo prebuild --no-install`) over claiming something is confirmed when it isn't, and list the gap plainly in the PR.
- **Don't expand scope to finish a dependency an issue only mentions.** When an issue's own notes point at another still-open issue (e.g. "same brand assets as #226"), implement only what *this* issue asks, note the simplification and why, and move on — don't start implementing the referenced issue too.
