## MODIFIED Requirements

### Requirement: Agent-neutral copy
Product copy in the app, the daemon CLI, the installers, the push notifications, the READMEs and store metadata SHALL describe Remote Harness as a tool for coding agents ("follow and drive your coding agents from your phone"), never as a Claude Code-only tool. Texts that address or name the agent of a session SHALL use the agent's display name when the session's agent is known and "the agent" (translated, capitalized at the start of a sentence) otherwise, through one helper that every call site uses. "Claude Code" SHALL remain only where the text really refers to Claude Code: profiles and accounts, hooks, transcripts, Claude Code's own features (such as `--worktree`) and prerequisites.

#### Scenario: Composer of a session with an unknown agent
- **WHEN** the app shows the composer of a session whose agent is not known
- **THEN** the placeholder reads "Message the agent…" (pt-BR "Mensagem para o agente…", es-ES "Mensaje para el agente…")

#### Scenario: Question from a known agent
- **WHEN** a session whose agent is known as Codex asks a question
- **THEN** the card title reads "Codex has a question"

#### Scenario: Question push
- **WHEN** the daemon sends the push for a pending question
- **THEN** its title reads "The agent is waiting for your answer" in the daemon's language

#### Scenario: Installer step about accounts
- **WHEN** the setup guide describes the installer
- **THEN** it still says "Claude Code accounts", because that is what the installer lists
