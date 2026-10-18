## ADDED Requirements

### Requirement: Product accent and agent colors
Amber `#E8A33D` SHALL be the product accent of Remote Harness in the app, the notifications and the brand surfaces. Claude orange `#D97757` SHALL identify the Claude Code agent only, next to the other agents' colors (Codex `#2FBF8F`, Kimi `#5B9BF5`, Qwen `#8C6CF5`), and MUST NOT be used as the product accent. The warning color SHALL be `#F3DC7A`, distinct from the accent, so a waiting state never reads as the brand color.

#### Scenario: Running and waiting sessions
- **WHEN** one session is running and another waits for a permission
- **THEN** the running state uses the amber accent and the waiting state uses the warning yellow

#### Scenario: Android notification accent
- **WHEN** a push notification is shown on Android
- **THEN** its accent color is amber
