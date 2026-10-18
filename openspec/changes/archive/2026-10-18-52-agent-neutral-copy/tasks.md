## 1. Helper

- [x] 1.1 `AGENT_NAMES` in `core/theme/agents.ts`; `features/sessions/agent.ts` (`sessionAgent`, `agentLabel`) with tests; `agents.generic` / `agents.genericSentence` in the three catalogs

## 2. Copy

- [x] 2.1 App catalogs: composer placeholder, question title, auto-mode body, launch failure with `{{agent}}`; setup guide intro agent-neutral; call sites interpolate the label
- [x] 2.2 Daemon catalogs: CLI description, setup welcome, question push; push test updated
- [x] 2.3 `app.config.ts` photo prompt; README taglines (en, pt-BR)

## 3. Verification

- [x] 3.1 `pnpm check` green (turbo typecheck + tests 10/10: catalog parity, banner width, push text, start-plan text; Biome on `apps packages`)
