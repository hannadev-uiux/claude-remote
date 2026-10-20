# Agent & provider icons

The icons in this folder (`ClaudeIcon`, `CodexIcon`, `KimiIcon`, `QwenIcon`, `OpenRouterIcon`) are
**neutral placeholders** — a circle, a diamond, a triangle, a hexagon and an outlined fork. They are
not Anthropic's, OpenAI's, Moonshot's, Alibaba's or OpenRouter's actual marks.

## Replacing a placeholder with the real mark

For each company:

1. Get the current brand/logo guidelines and an official SVG or vector source directly from that
   company (their brand page, press kit, or developer docs).
2. Confirm nominative use (identifying a compatible tool, no implied endorsement) is allowed, and
   note any restriction on modifying the mark (most require it to stay unmodified except for a
   monochrome recolor).
3. Replace only that id's component file, keeping its exported name and the `{ size, color }` props
   (`AgentIconProps` in `types.ts`) so every caller (`AgentBadge`, `ProviderChip`) needs no changes.
4. Record the asset's source and terms somewhere in the repo (e.g. this file, or
   `apps/mobile/assets/brands/README.md` if one exists) so the license basis is traceable.
5. If a company's guidelines forbid the use needed here, leave that one id's placeholder in place —
   `agentIconFor` and the fallback to the two-letter code/text-only chip keep working either way.
