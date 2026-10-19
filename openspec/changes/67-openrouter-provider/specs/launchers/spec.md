## MODIFIED Requirements

### Requirement: Open session in tmux
The launcher SHALL create (if it does not exist) the tmux session `claude-remote` and open in it a new window named `<profile>:<directory>` running `claude` with the profile's `CLAUDE_CONFIG_DIR` and `CLAUDE_REMOTE_PROFILE` set, forwarding all arguments received. For a profile with a provider, the launcher SHALL export the provider's `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL` and `ANTHROPIC_SMALL_FAST_MODEL` (those configured), unset `ANTHROPIC_API_KEY` in the window, and read the provider key from the OS secret store (the `0600` file when present, else the macOS Keychain, else the Secret Service) only inside the new window, exporting it as `ANTHROPIC_AUTH_TOKEN`; the key MUST NOT appear on any command line nor in the launcher file. When no key is stored, the launcher MUST fail before creating the window with a message naming `remote-harness provider key <profile>`.

#### Scenario: Outside tmux
- **WHEN** the user runs `claudin --resume` in a terminal outside tmux
- **THEN** a window is created in the `claude-remote` session with `claude --resume` and the terminal attaches to it

#### Scenario: Inside tmux
- **WHEN** the user runs `drclaude` inside another tmux session
- **THEN** the window is created in the `claude-remote` session and the current client switches to it

#### Scenario: OpenRouter profile
- **WHEN** the user runs the launcher of a profile with provider `openrouter` and a stored key
- **THEN** the window runs `claude` with `ANTHROPIC_BASE_URL` set to the gateway, `ANTHROPIC_AUTH_TOKEN` read inside the window and `ANTHROPIC_API_KEY` unset, and `ps` never shows the key

#### Scenario: Missing key
- **WHEN** the user runs the launcher of a profile with a provider and no key is stored
- **THEN** no window is created and the message points to `remote-harness provider key <profile>`
