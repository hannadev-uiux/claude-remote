## ADDED Requirements

### Requirement: Status line wrapper installation
The installer SHALL write a `remote-harness-statusline` script to the launcher folder and set each profile's `statusLine` to a `command` that runs it, keeping the user's previous command (if any) encoded in the command's argument and every other key of the `statusLine` object. The script MUST forward its stdin to the daemon in the background with a short timeout and MUST then run the original command with the same input, so the terminal output is unchanged; when the daemon is not running the status line MUST still work. Running the installer twice MUST produce the same file, and the write MUST follow read → merge → backup → atomic write.

#### Scenario: User status line kept
- **WHEN** the profile already has `statusLine.command` `bash ~/.claude/statusline.sh`
- **THEN** after install the terminal shows the same status line and the daemon receives the status JSON

#### Scenario: No previous status line
- **WHEN** the profile had no `statusLine`
- **THEN** the wrapper prints nothing and the daemon still receives the status JSON

#### Scenario: Reinstall
- **WHEN** the installer runs a second time
- **THEN** `settings.json` is unchanged

#### Scenario: Uninstall
- **WHEN** the user runs `remote-harness uninstall`
- **THEN** the original `statusLine` is restored, or removed when there was none

### Requirement: Session status and account limits
The daemon SHALL accept the status line JSON on `POST /statusline` (127.0.0.1 with the hooks secret) and SHALL derive, per session, the model display name, the effort level and the context window usage (used tokens, window size, percentage), and, per profile, the 5-hour and 7-day usage windows (percentage and reset time). Session status MUST be sent as `Session.status` without changing the session's `updatedAt`; limits MUST be sent once per profile with `limits.updated` and replayed to clients when they connect. Missing fields MUST be sent as `null`, never as zero.

#### Scenario: Context usage
- **WHEN** the status JSON has `context_window.used_percentage` 62 with 124000 of 200000 tokens
- **THEN** the session's status has `context` `{ usedTokens: 124000, size: 200000, percent: 62 }`

#### Scenario: Limits once per profile
- **WHEN** two sessions of the same profile report the same rate limits
- **THEN** clients receive a single `limits.updated` for that profile

#### Scenario: API key account
- **WHEN** the status JSON has no `rate_limits`
- **THEN** the profile's limits stay unknown and no `limits.updated` is sent

#### Scenario: Session not registered yet
- **WHEN** the status line arrives before the session's `SessionStart`
- **THEN** the status is applied as soon as the session is registered
