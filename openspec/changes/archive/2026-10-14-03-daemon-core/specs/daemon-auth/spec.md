## Purpose

Ensures that only the paired device controls the sessions, since the daemon is equivalent to a remote shell.

## ADDED Requirements

### Requirement: Mandatory token
Every WebSocket connection SHALL send `auth` with the token as its first message within 5 seconds; otherwise the daemon MUST close the connection. Messages sent before authentication MUST be rejected.

#### Scenario: Correct token
- **WHEN** the client sends `auth` with the valid token
- **THEN** the daemon responds with `auth.ok` with the protocol version and the profiles

#### Scenario: Invalid token
- **WHEN** the client sends `auth` with a wrong token
- **THEN** the daemon responds with `error` `unauthorized` and closes the connection

#### Scenario: No authentication
- **WHEN** the client does not send `auth` within 5 seconds
- **THEN** the connection is closed

### Requirement: Restricted network interface
The WebSocket SHALL listen only on the Mac's Tailscale address (range 100.64.0.0/10) or, in explicit development mode, on `127.0.0.1`. The hooks endpoint MUST listen only on `127.0.0.1` and require the local secret.

#### Scenario: Tailscale missing
- **WHEN** the daemon starts without a Tailscale interface and without dev mode
- **THEN** it exits with an error explaining that Tailscale is required

#### Scenario: Hook without secret
- **WHEN** a request reaches the hooks endpoint without the secret
- **THEN** it responds 401 and does not process the event

### Requirement: Pairing and rotation
The `pair` command SHALL display a QR code with the URL `claude-remote://pair?host=<ip>&port=<port>&token=<token>`. The `rotate-token` command MUST generate a new token and drop existing connections.

#### Scenario: Rotation
- **WHEN** the user runs `rotate-token`
- **THEN** open connections are closed and the old token is no longer accepted

### Requirement: Token storage
The token SHALL be stored in the macOS Keychain and never written in plain text to disk.

#### Scenario: Persisted token
- **WHEN** the daemon restarts
- **THEN** the same token remains valid
