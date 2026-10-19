## ADDED Requirements

### Requirement: On-device error log
The app SHALL record JS crashes, unhandled promise rejections, render errors and failed daemon requests (error replies other than `unknown_type`, and timeouts) in a rotating log on the device with at most 50 entries. Recording MUST NOT send anything off the device. Each entry MUST contain only the allowlisted fields: time, source, error name, scrubbed message, scrubbed stack, request type, error code, route pattern and the app context (app version, runtime version, OTA update id and channel, platform, OS version, daemon version). Request errors MUST NOT carry the daemon's message.

#### Scenario: Failed request
- **WHEN** a `session.start` request is answered with `error` `invalid_cwd` and message "not a directory: /Users/me/secret"
- **THEN** the log gains an entry with source `request`, type `session.start` and code `invalid_cwd`, and without the message

#### Scenario: Rotation
- **WHEN** the log has 50 entries and another error happens
- **THEN** the oldest entry is dropped

### Requirement: Scrubbing
Free text in an entry SHALL be scrubbed before it is stored: text between quotes or backticks, URLs, emails, file paths (except their base name) and long token-like runs MUST be replaced by placeholders, and messages and stacks MUST be cut to a fixed size. The route MUST be the route pattern, never the concrete path. A report MUST NOT contain prompts, transcript text, terminal output, commands, paths, project or session names, tokens or pairing data.

#### Scenario: Transcript text in an error
- **WHEN** an error message contains a transcript line in quotes and a path to the project
- **THEN** the stored and sent entry contains neither the transcript text nor the path

### Requirement: Consent
The app SHALL offer the preference Send automatically / Ask each time / Never in Settings, defaulting to Ask each time. Nothing MUST be sent without consent: native collection is off by default and is enabled only with Send automatically. With Never, the app MUST NOT send reports and MUST delete unsent native crash reports. On the launch after a crash, Send automatically sends the pending report, Ask each time shows a prompt with a preview of exactly what will be sent and the three choices, and Never discards it.

#### Scenario: Crash with Ask each time
- **WHEN** the app crashed in the previous run and the preference is Ask each time
- **THEN** on launch the app shows "The app closed unexpectedly. Send the report?" with the preview, and sends only if the user taps Send

#### Scenario: Never
- **WHEN** the preference is Never
- **THEN** no report is sent, unsent native reports are deleted, and the Send action of "Report a problem" is hidden

### Requirement: Report a problem
Settings SHALL open a "Report a problem" screen with a description field, an option to include the computer's recent rejected requests (when the daemon supports `diagnostics.errors`), a preview of the report, and actions to send it through Crashlytics (hidden with Never or without Firebase in the build), share it (a file on iOS, text on Android) or open a prefilled GitHub issue.

#### Scenario: Share without Firebase
- **WHEN** the build has no Firebase and the user taps Share
- **THEN** the share sheet opens with the report, and no Send action is shown

### Requirement: Render error fallback
A render error SHALL show a themed fallback screen with a "Try again" action instead of a blank app, and MUST be recorded in the log.

#### Scenario: Screen throws while rendering
- **WHEN** a screen throws during render
- **THEN** the fallback appears and the log gains an entry with source `render`
