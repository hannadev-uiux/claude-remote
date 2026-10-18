## Why

The product copy still describes a Claude Code-only tool: the README and CLI taglines say "control Claude Code sessions in tmux from your phone", the composer says "message Claude…", the question card and the push say "Claude has a question" / "Claude is waiting for your answer", the auto-mode warning says "Claude will decide…", and the photo permission prompt says photos go "to Claude Code". Remote Harness is becoming multi-agent (#108, #109), so the copy must name the agent of the session when it is known and say "the agent" otherwise, keeping "Claude Code" only where it really is Claude Code (profiles, accounts, hooks, transcripts, the `--worktree` hint) (#87).

## What Changes

- **Agent naming helper** in the app: `agentLabel(agent, t)` returns the agent's display name (`Claude Code`, `Codex`, `Kimi`, `Qwen`, from `AGENT_NAMES` next to the agent colors) when the agent is known, and the translated "the agent" (or "The agent" at the start of a sentence) otherwise. `sessionAgent(session)` is the single seam that returns `null` until the protocol carries the agent (#108).
- **App copy** (pt-BR, en-US, es-ES) with `{{agent}}` interpolation: composer placeholder ("message the agent… (@ files, / commands)"), question card title ("The agent has a question"), auto-mode confirmation ("The agent will decide on its own…"), launch failure ("Could not open the agent in tmux"). The setup guide intro says "the computer where your coding agent runs"; its installer steps keep "Claude Code accounts", which is what the installer really asks. The worktree hint keeps "Claude Code" (it describes Claude Code's `--worktree`).
- **Daemon copy**: CLI description and setup welcome become "follow and drive your coding agents from your phone"; the question push says "The agent is waiting for your answer". Account, login and hook texts keep "Claude Code".
- **System prompts** (`app.config.ts`): photos are "sent with the prompt to the coding agent on your computer".
- **README** (en, pt-BR) tagline: "Follow and drive your coding agents — Claude Code today, more to come — running on your Mac, Linux or Windows (WSL) machine, from your iPhone or Android phone."
- Store metadata and the landing follow the same wording when they exist (#161, #135).

## Capabilities

### New Capabilities

### Modified Capabilities
- `product-identity`: a new "Agent-neutral copy" requirement fixes the rule and the helper.

## Impact

- `apps/mobile`: `core/theme/agents.ts` (`AGENT_NAMES`), `features/sessions/agent.ts` (+ test), four call sites (composer, question card, mode selector, start plan), the three catalogs, `app.config.ts`.
- `apps/daemon`: the three catalogs (`description`, `setup.welcome.intro2`, `push.questionPending`) and the push test.
- `README.md`, `README.pt-BR.md`. No protocol change.
