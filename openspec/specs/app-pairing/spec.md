# app-pairing Specification

## Purpose
Links the app to a specific daemon securely, reading the address and token from a QR code or manual entry.

## Requirements

### Requirement: QR pairing
The app SHALL read the QR shown by `remote-harness pair`, extract host, port and token, test the connection and, on `auth.ok`, save the credentials and open the session list.

#### Scenario: Valid QR
- **WHEN** the user points the camera at the daemon's QR
- **THEN** the app connects, saves the credentials and shows the session list

#### Scenario: QR in another format
- **WHEN** the QR is not a `claude-remote://pair` URL
- **THEN** the app shows "Invalid QR" and keeps scanning

#### Scenario: Token rejected
- **WHEN** the daemon responds `unauthorized`
- **THEN** nothing is saved and the app shows the error

### Requirement: Manual entry
The app SHALL allow entering host, port and token manually, with the same connection test.

#### Scenario: No camera
- **WHEN** the user denies camera permission
- **THEN** the manual form is offered

### Requirement: Secure storage
The token MUST be stored only in SecureStore (the iOS Keychain).

#### Scenario: Reopening the app
- **WHEN** the app is closed and opened
- **THEN** it connects automatically with the saved credentials

### Requirement: Forget daemon
The settings screen SHALL allow erasing the credentials and returning to pairing through `Forget this machine` in the Machine card, after a confirmation.

#### Scenario: Forget
- **WHEN** the user confirms "Forget this machine"
- **THEN** the credentials are erased, the connection closes and the pairing screen appears
