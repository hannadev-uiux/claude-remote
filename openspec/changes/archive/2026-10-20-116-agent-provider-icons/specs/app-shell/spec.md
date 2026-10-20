## MODIFIED Requirements

### Requirement: Agent colors
The app SHALL define fixed colors for the agents, independent of the theme: Claude Code `#D97757`, Codex `#2FBF8F`, Kimi `#5B9BF5`, Qwen `#8C6CF5`. Model providers (OpenRouter) SHALL be shown with a neutral outline and MUST NOT get a color of their own. Agents and providers with an icon registered (`src/ui/agent-icons/`) SHALL show that icon in the agent badge (drawn in the agent's color) or the provider chip (drawn in the chip's neutral color) instead of the agent badge's two-letter code; an agent or provider without a registered icon MUST keep the two-letter code / text-only chip, so a future agent id never goes unrepresented.

#### Scenario: Agent color across themes
- **WHEN** the theme changes
- **THEN** the color that identifies Claude Code stays `#D97757`

#### Scenario: Agent badge shows its icon
- **WHEN** a session's profile uses Claude Code
- **THEN** its agent badge shows the Claude Code icon drawn in `#D97757`, not the `cl` code

#### Scenario: Provider chip shows its icon
- **WHEN** a profile routes through OpenRouter
- **THEN** its `via OpenRouter` chip shows the OpenRouter icon next to the text

#### Scenario: Unregistered agent falls back to the letter code
- **WHEN** an agent id has no icon registered in `src/ui/agent-icons/`
- **THEN** its badge keeps showing the two-letter code, exactly as before this change
