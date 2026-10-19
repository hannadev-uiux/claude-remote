# Design · 72 Keep awake

## Locked screen vs. sleep

A locked screen with the machine awake does not affect the daemon: the WebSocket over Tailscale, tmux input, hooks, transcripts and push keep working. Things that read the macOS Keychain do so at start (the token) or on `rotate-token`; the login keychain stays unlocked while the screen is locked. The launchd user agent keeps running under lock; on Linux the systemd user unit keeps running (with lingering, also after logout). What stops everything is **sleep**, so this change is about preventing idle sleep and telling the user when the computer is unreachable.

## Inhibitor helpers

One child process per platform, alive exactly while the assertion is held:

| Platform | Command | Ends when |
| --- | --- | --- |
| macOS | `caffeinate -i -w <daemon pid>` | killed, or the daemon exits (`-w`) |
| Linux | `systemd-inhibit --what=idle:sleep --who="Remote Harness" --why=<text> --mode=block cat` | killed, or stdin closes (daemon exit) |
| WSL | `powershell.exe -NoProfile -NonInteractive -Command <script>` | killed, or stdin closes |

`-i` only prevents idle sleep: the display can sleep and the screen locks as usual. A laptop with the lid closed still sleeps (macOS needs power and an external display for clamshell); the daemon never changes `pmset`.

The PowerShell script declares `SetThreadExecutionState` with `Add-Type`, calls it with `ES_CONTINUOUS | ES_SYSTEM_REQUIRED` (`0x80000001`) and loops on `[Console]::In.ReadLine()` until it returns `$null`; the state is released when the process exits.

`acquire()` spawns the helper and waits 1 s: if it exited by then (missing binary, polkit refusal, no interop) it reports failure with the stderr line, and the controller logs once and reports `available: false` until the mode changes. A helper that dies later is noticed through its exit event; the next evaluation re-acquires.

## Policy

```
keepAwakeDecision(mode, active, lastActiveAt, now, graceMs) → { hold, recheckInMs }
```

- `off` → no hold. `always` → hold.
- `sessions`: hold while any session is `running` or `waiting`; after the last one stops, keep holding until `lastActiveAt + grace` (10 min) and ask to be re-evaluated then. The grace covers the gap between a finished turn and the next prompt from the phone, since the OS idle timer counts from the last keyboard or mouse input and would sleep the machine right away.

The controller evaluates on every session store change, on the grace timer and on `/admin/keep-awake-reload` (which re-reads the mode from the config file).

## Visibility

- `GET /power` (hooks server, secret header) → `{ mode, holding, available, helper }`, used by `doctor` and `keep-awake`.
- `doctor`: `✓ keep awake: while sessions are active (held now / not needed now)`; `✗` when the helper is unavailable, with the hint; `· keep awake: off`. On a Mac with a battery (`pmset -g batt` lists `InternalBattery`), an info line about the lid.

## App

React Native's WebSocket does not say why a connection failed, but timing does: a refused port fails at once, while an asleep or offline peer over Tailscale never answers. `DaemonClient` gets a 10 s connect timeout: an attempt that has not opened by then is closed and marked unreachable. While reconnecting after an unreachable attempt, `ConnectionBanner` shows "{{machine}} is not answering: it may be asleep or offline" instead of "reconnecting…". A successful open clears the flag.
