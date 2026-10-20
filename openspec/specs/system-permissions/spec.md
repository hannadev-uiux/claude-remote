# system-permissions Specification

## Purpose

Gives the user one place to see every system permission the app and the computer rely on, its current status, why it's needed, and how to fix it — instead of guessing why push, voice, photos or a project folder silently stopped working.

## Requirements

### Requirement: Permissions screen
Settings SHALL offer a **Permissions** entry opening a screen with two sections, **On this phone** and **On this computer**. Each row SHALL show: a label, a status badge (**Allowed**, **Denied**, **Not asked**, **Limited** or **Not available**), one line on why the app or the computer needs it, and an action — **Allow** (triggers the system permission prompt) when `Not asked`, **Open Settings** (phone rows) or **Open on the computer** (computer rows) when `Denied`, and no action for `Allowed`, `Limited` or `Not available`. A row whose permission does not exist on the current platform MUST be hidden rather than shown as `Not available` (`Not available` is for a permission that exists on this platform but cannot be determined, not one that doesn't apply). All labels, reasons and actions MUST be translated.

#### Scenario: Mixed statuses
- **WHEN** Notifications is denied and Camera is allowed
- **THEN** Notifications shows "Denied" with "Open Settings", Camera shows "Allowed" with no action

#### Scenario: Not asked yet
- **WHEN** Microphone has never been requested
- **THEN** its row shows "Not asked" with an "Allow" action that triggers the system prompt

#### Scenario: Permission that doesn't exist here
- **WHEN** the screen is shown on Android
- **THEN** the Local network row (iOS only) is not shown at all

### Requirement: Phone permissions
The **On this phone** section SHALL report, from the already-integrated SDKs, without prompting: **Notifications** (`expo-notifications`), **Camera** (`expo-image-picker`), **Photos** (`expo-image-picker`, reporting `Limited` on iOS when `accessPrivileges` is `limited`), **Microphone + Speech recognition** (`expo-speech-recognition`, one combined row), and, iOS only, **Local network** (no direct query API exists; the row SHALL read `Allowed` when the app is currently connected to the daemon over a local network, `Not asked` otherwise — this is a heuristic, not an authoritative OS query). Status mapping from each SDK's native result to this screen's status enum SHALL be pure functions, one per permission kind, each covered by Vitest tests independent of any native module. Tapping **Allow** SHALL call that permission's `request…Async` and refresh the row from its result; tapping **Open Settings** SHALL open the OS settings app.

#### Scenario: Limited photo access
- **WHEN** iOS reports `accessPrivileges: 'limited'` for the photo library
- **THEN** the Photos row shows "Limited"

#### Scenario: Requesting notifications
- **WHEN** the user taps "Allow" on a "Not asked" Notifications row
- **THEN** the OS prompt appears and the row updates from its result without leaving the screen

#### Scenario: Local network while connected
- **WHEN** the phone is on iOS and currently connected to the daemon
- **THEN** the Local network row shows "Allowed"

### Requirement: Computer permissions
The daemon SHALL answer a new `machine.permissions` message with `machine.permissions.results { permissions }`, a content-free list (file and folder names only, never contents) covering: **Folder access** (one entry per folder the daemon just tried to list: the profiles' recently-used project directories plus `~/Desktop`, `~/Documents`, `~/Downloads`, each `allowed` when listable, `denied` on a permission error, left out when the folder doesn't exist), **Full Disk Access** (`allowed` only when all three well-known folders above are listable, `denied` when any of them is a permission error, `not_available` outside macOS), **Accessibility/Automation** (macOS: `allowed` when AppleScript can address another app, `denied` when it reports error `-1743` ("not authorized to send Apple events"), `not_available` elsewhere), **Desktop notifications** (always `not_available`: no CLI or scripting surface reports notification authorization status without native code — see proposal Non-goals) and **Keychain access** (`allowed` when the token store selected for this platform is a real OS secret store — Keychain on macOS, the Secret Service via `secret-tool` on Linux — and a round-trip read/write succeeds; `not_available` when the daemon fell back to the plain file store). Every classification SHALL be a pure function over its inputs (an `errno`, an exit code, a token-store kind), tested independently of any process call; only the process calls themselves (`fs.readdir`, `osascript`) live in `infra/`.

#### Scenario: Readable project folder
- **WHEN** a profile's most recent project directory is listable by the daemon's process
- **THEN** its Folder access entry is `allowed`

#### Scenario: TCC-denied folder
- **WHEN** `fs.readdir` on `~/Desktop` fails with `EPERM` or `EACCES`
- **THEN** its Folder access entry is `denied` and Full Disk Access is `denied`

#### Scenario: Automation denied
- **WHEN** `osascript` addressing another application exits non-zero reporting `(-1743)`
- **THEN** Accessibility/Automation is `denied`

#### Scenario: No real secret store
- **WHEN** the platform's token store selection fell back to the plain file store
- **THEN** Keychain access is `not_available`, not `denied`

#### Scenario: Linux has no TCC rows
- **WHEN** `machine.permissions` is requested on Linux (no WSL)
- **THEN** the reply has no Accessibility/Automation entry and Full Disk Access is `not_available`

### Requirement: Fixing a denied computer permission
For a `denied` computer-side row, the screen SHALL show the System Settings path to fix it and an **Open on the computer** action; tapping it SHALL make the daemon open the matching System Settings pane (macOS: `open` with the pane's `x-apple.systempreferences:` URL) or, where there is no such pane (Linux/WSL), do nothing beyond showing the instructions already on screen.

#### Scenario: Open Full Disk Access settings
- **WHEN** the user taps "Open on the computer" on a denied Full Disk Access row
- **THEN** the daemon opens System Settings → Privacy & Security → Full Disk Access

### Requirement: Doctor integration
`remote-harness doctor` SHALL print the same Folder access (well-known folders only, not every recent project), Accessibility/Automation and Keychain checks as the Permissions screen, using the identical pure classification functions, each as a `✓`/`✗` line consistent with the command's existing checks.

#### Scenario: Doctor reports a denied check
- **WHEN** `doctor` runs on a machine without Full Disk Access
- **THEN** its output includes a `✗` line for Full Disk Access with the same hint the app would show
