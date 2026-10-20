## Why

Agents and providers are identified by a small colored box with a cryptic two-letter code (`AGENT_CODES` in `apps/mobile/src/core/theme/agents.ts`: `cl`/`cx`/`ki`/`qw`), repeated across the session list, session header, new session screen, waiting strip, actions sheet and profiles card; the OpenRouter provider chip has no mark at all. Issue #226 asks for real product marks instead.

This change ships the icon plumbing and a placeholder icon set instead of each company's actual brand mark: reproducing official logos correctly requires each company's current brand guidelines and source assets, which is out of scope for an automated change and needs a human decision per company. The icon lookup, the badge/chip wiring, and the fallback behavior are exactly what a later asset swap needs — only the five SVG files change when real marks are available.

## What Changes

- New `apps/mobile/src/ui/agent-icons/` module: one placeholder SVG icon per id (`claude`, `codex`, `kimi`, `qwen`, `openrouter`), monochrome, sized and colored by props, plus a pure `agentIconFor(id)` lookup (`null` for an id without one).
- `AgentBadge` renders the icon instead of the two-letter code when one exists for its agent; an agent without one keeps today's letter code (forward-compatible fallback, not reachable by any current agent id).
- `ProviderChip` (and `ProfileProviderChip`) shows the provider's icon next to its name instead of text only.
- A `README.md` in `agent-icons/` documents that these are neutral placeholders and names what replacing them with the real, brand-guideline-compliant marks requires.
- No change to `AGENT_CODES`, `AGENT_COLORS`, `AGENT_NAMES`, or any accessibility label — only the glyph drawn inside the existing badge/chip changes.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `app-shell`: the "Agent colors" requirement's description of how agents and providers are shown gains the icon (still agent-colored for agents, still a neutral outline for providers).

## Impact

- `apps/mobile/src/ui/agent-icons/` (new): `index.ts`, one component per id, `README.md`.
- `apps/mobile/src/ui/AgentBadge.tsx`: renders the icon when available.
- `apps/mobile/src/ui/ProviderChip.tsx`: takes the provider's `kind` instead of a plain display string, to look up its icon; `apps/mobile/src/features/providers/ProfileProviderChip.tsx` updated to match (its only caller).
- No i18n, daemon, or protocol impact.
