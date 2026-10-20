## ADDED Requirements

### Requirement: Opt-in performance data
In builds with Firebase, the app SHALL include Firebase Performance Monitoring with collection off until the user turns on "Send performance data" in Settings → Error reports. The choice SHALL be saved per device and applied at every start. The switch MUST NOT be shown in builds without Firebase. Android builds MUST NOT apply the Gradle plugin that instruments network requests. Traces MUST NOT carry session content, prompts, paths, project or session names, or the daemon's address, and the app MUST NOT send Analytics events.

#### Scenario: Default
- **WHEN** the app is installed and started
- **THEN** no performance data is sent

#### Scenario: Turned on
- **WHEN** the user turns on "Send performance data"
- **THEN** Firebase collects the automatic traces and the app's custom traces from then on

### Requirement: App-ready trace
With collection on, the app SHALL record once per run an `app_ready` trace whose metric `ready_ms` is the time from the start of its JavaScript to the first established daemon connection, with the attribute `outcome` `connected`, or `timeout` when no connection opens within 60 seconds.

#### Scenario: Slow start
- **WHEN** the daemon connection opens 4 seconds after start
- **THEN** an `app_ready` trace with `ready_ms` of about 4000 and `outcome: connected` is recorded

### Requirement: JavaScript responsiveness trace
With collection on, the app SHALL measure how late a 500 ms timer fires while it is active. A delay of 1 second or more counts as a stall. Each stretch in the foreground SHALL be recorded as a `js_responsiveness` trace with the metrics `stalls` (1 s or more), `long_stalls` (5 s or more), `stall_max_ms` and `stall_total_ms`, and the attribute `layout`.

#### Scenario: Frozen for six seconds
- **WHEN** the JavaScript thread is blocked for six seconds and the app then goes to the background
- **THEN** the trace has `stalls: 1`, `long_stalls: 1` and `stall_max_ms` of about 6000
