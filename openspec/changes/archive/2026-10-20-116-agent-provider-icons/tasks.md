## 1. Icon module

- [x] 1.1 Add `apps/mobile/src/ui/agent-icons/types.ts` (or inline): a shared `AgentIconProps = { size: number; color: string }` and `AgentIconId = AgentId | ProviderKind`.
- [x] 1.2 Add one placeholder SVG component per id in `apps/mobile/src/ui/agent-icons/` (`ClaudeIcon.tsx`, `CodexIcon.tsx`, `KimiIcon.tsx`, `QwenIcon.tsx`, `OpenRouterIcon.tsx`), using `react-native-svg` the same way `Mark.tsx` does: simple, distinct, monochrome geometric glyphs (not a reproduction of any company's actual mark) — a filled circle, diamond, triangle, hexagon and an outlined branch/fork shape respectively, all taking `size`/`color`.
- [x] 1.3 Add `apps/mobile/src/ui/agent-icons/index.ts`: `agentIconFor(id: string)` returning the matching component or `null`; export every icon component too.
- [x] 1.4 Add `apps/mobile/src/ui/agent-icons/agent-icons.test.ts`: verify the fallback logic resolves each of the 5 known ids and returns `null`/`false` for an unknown one. (Split into `ids.ts`, a pure id-membership check, so the test doesn't import the `.tsx` icon components — this repo's Vitest/rolldown setup can't parse files that transitively pull in `react-native`/`react-native-svg`'s Flow-annotated internals, the same issue change 114 hit with the theme barrel; `agentIconFor` itself composes `ids.ts` with the components and is exercised by `tsc` plus the manual check in task 4.2, like every other component in this module.)
- [x] 1.5 Add `apps/mobile/src/ui/agent-icons/README.md` noting these are neutral placeholders (not the companies' real marks) and what swapping in the official, brand-guideline-compliant assets later requires (same file names, same `size`/`color` props).
- [x] 1.6 Export the module from `apps/mobile/src/ui/index.ts`.

## 2. AgentBadge

- [x] 2.1 `AgentBadge` renders `agentIconFor(agent)`'s icon (in `AGENT_BADGE_INK`, sized relative to the badge) when one exists, falling back to the existing two-letter `Text` otherwise; `accessibilityLabel` is unchanged (still `AGENT_NAMES[agent]`).

## 3. ProviderChip

- [x] 3.1 Change `ProviderChip`'s prop from a plain `provider: string` to `kind: ProviderKind` (from `@remote-harness/protocol`), deriving the label from `PROVIDER_NAMES[kind]` internally and rendering `agentIconFor(kind)`'s icon (in `textMuted`) before the label when one exists.
- [x] 3.2 Update `ProfileProviderChip.tsx` (the only caller) to pass `profile.provider.kind` instead of the resolved name.

## 4. Verification

- [x] 4.1 Run `pnpm check` (typecheck + Vitest + Biome) green.
- [x] 4.2 Manually verify (simulator or `expo export` bundle check): session list, session header, new session screen, waiting strip, actions sheet and profiles card show the new agent icons; a profile routed through OpenRouter shows the provider icon in its chip. (No dev build was available for this session's simulator; verified via `npx expo export --platform ios`, which bundles successfully, plus a read-through confirming all 6 `AgentBadge` call sites and the profile provider chip render through the updated components unchanged at the call-site level. Recommend a manual simulator pass before merging to see the actual glyphs rendered.)
