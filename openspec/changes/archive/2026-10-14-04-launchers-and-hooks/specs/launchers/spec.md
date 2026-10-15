## Purpose

Provides commands that start Claude Code inside tmux, with the correct profile, so the session can be controlled from the phone.

## ADDED Requirements

### Requirement: Open session in tmux
The launcher SHALL create (if it does not exist) the tmux session `claude-remote` and open in it a new window named `<profile>:<directory>` running `claude` with the profile's `CLAUDE_CONFIG_DIR` and `CLAUDE_REMOTE_PROFILE` set, forwarding all arguments received.

#### Scenario: Outside tmux
- **WHEN** the user runs `claudin --resume` in a terminal outside tmux
- **THEN** a window is created in the `claude-remote` session with `claude --resume` and the terminal attaches to it

#### Scenario: Inside tmux
- **WHEN** the user runs `drclaude` inside another tmux session
- **THEN** the window is created in the `claude-remote` session and the current client switches to it

### Requirement: Plain claude untouched
The installation MUST NOT change the `claude` command.

#### Scenario: claude outside the launcher
- **WHEN** the user runs `claude` directly
- **THEN** the session opens normally outside tmux
