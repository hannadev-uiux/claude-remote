## Context

Every user-facing text goes through the three catalogs (`apps/mobile/src/core/i18n/locales`, `apps/daemon/src/core/i18n`), with parity tests. Sessions and profiles have no `agent` field yet (#108 adds `agent: 'claude' | 'codex' | …` to the protocol); today every session is Claude Code. The design's voice rules (`docs/design/identity/index.html`, "Voice"): "the agent" in generic copy, the agent's name when the session's agent is known, "Claude Code" only where it is literally Claude Code.

## Goals / Non-Goals

**Goals:** no product copy that assumes Claude is the only agent; one helper that decides how to name the agent, so #108 only has to feed it; identical wording rules in the app, the CLI, the push and the README.

**Non-Goals:** renaming "daemon" to "machine" (#94); the protocol `agent` field and per-session names (#108); store metadata and the landing (#161, #135); the agent badge (#153).

## Decisions

- **Helper, not a hidden default.** `sessionAgent()` returns `null` today with a comment pointing at #108, and `agentLabel(null, t)` yields the translated "the agent" (`agents.generic`) or "The agent" (`agents.genericSentence`) for sentence starts; `agentLabel('codex', t)` yields `AGENT_NAMES.codex`. Call sites interpolate `{{agent}}`, so the catalogs already hold the final sentences and the switch to real names needs no copy change. Agent display names live in `core/theme/agents.ts` next to the colors (one table per agent).
- **Where "Claude Code" stays.** Setup-guide installer steps (the installer really lists Claude Code accounts), the worktree hint (Claude Code's `--worktree`), daemon setup texts about accounts/login/`CLAUDE_CONFIG_DIR`, hook messages shown inside Claude Code's TUI, and the installer's prerequisite error. These are facts about Claude Code, not product positioning.
- **Sentence case across languages.** pt-BR and es-ES need the article in the generic form ("o agente", "el agente"); the `genericSentence` variant capitalizes it. Agent names are used as-is (no article), which reads fine in the three languages.
- **Daemon welcome.** `intro1` ends with "follow and control" and `intro2` continues the sentence; it becomes "your coding agents from your phone. It takes about 2 minutes." in each language, still within the banner width (the width test covers it).
- **README tagline** keeps a factual note ("Claude Code today, more to come") so the agent-neutral promise does not overclaim before #108 lands.

## Risks / Trade-offs

- Until #108, a Claude Code session is addressed as "the agent" instead of "Claude Code": slightly less specific, but consistent with the prototypes and avoids a second copy pass later.
- The push text loses the agent name as well; it carries no session content anyway.
