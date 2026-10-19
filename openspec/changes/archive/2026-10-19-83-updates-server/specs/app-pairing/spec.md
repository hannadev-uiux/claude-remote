## MODIFIED Requirements

### Requirement: QR pairing
The app SHALL read the QR shown by `remote-harness pair`, extract host, port and token, test the connection and, on `auth.ok`, save the credentials and open the session list. It SHALL register both the `remoteharness://` and the `claude-remote://` deep-link schemes and accept pairing links in either (`remoteharness://pair?…` and `claude-remote://pair?…`), so QR codes already printed keep working.

#### Scenario: Valid QR
- **WHEN** the user points the camera at the daemon's QR
- **THEN** the app connects, saves the credentials and shows the session list

#### Scenario: QR in another format
- **WHEN** the QR is not a `remoteharness://pair` or `claude-remote://pair` URL
- **THEN** the app shows "Invalid QR" and keeps scanning

#### Scenario: Token rejected
- **WHEN** the daemon responds `unauthorized`
- **THEN** nothing is saved and the app shows the error

#### Scenario: New scheme
- **WHEN** the app reads `remoteharness://pair?host=100.101.1.2&port=7337&token=…`
- **THEN** it pairs exactly as with the `claude-remote://` link
