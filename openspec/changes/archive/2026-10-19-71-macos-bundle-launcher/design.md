# Design · 71 macOS bundle launcher

## Responsible process

TCC asks about, and stores grants for, the *responsible process*: the process launchd started, unless it disclaimed responsibility. Children created with `posix_spawn` / `fork` inherit it. A shell script that `exec`s node replaces the image, so the responsible code becomes node. A compiled launcher that keeps running and spawns node as a child keeps the bundle (its signature and `Info.plist`) as the responsible code: prompts read "Remote Harness" with its icon.

## Launcher

`apps/daemon/macos/launcher.c`, about 60 lines:

- `argv[1..]` is the program and its arguments; missing → exit 64.
- `posix_spawn` with the inherited environment and stdio (launchd's log files).
- Handlers for SIGTERM, SIGINT, SIGHUP, SIGQUIT, SIGUSR1, SIGUSR2 forward the signal to the child.
- `waitpid` (retrying on EINTR); a normal exit returns the child's code, a signal death re-raises the same signal with the default action so launchd sees the same outcome.

C over Swift: no runtime, a smaller binary, and the same toolchain (`cc` from the Command Line Tools). `cc` without the CLT opens the GUI installer, so `xcode-select -p` is checked first.

## Stable signature

Ad-hoc signatures have no certificate or timestamp: the designated requirement is the cdhash, which depends on the executable, `Info.plist` and the sealed resources. Re-signing identical contents gives the same cdhash; any change resets the grant. So:

- The bundle holds no paths (node and `cli.js` come from `ProgramArguments`, which lives in the LaunchAgent plist, outside the bundle). Updating the daemon or switching Node versions does not touch the bundle.
- `Contents/Resources/bundle-stamp` stores a hash of the inputs (launcher binary, `Info.plist`, icon PNG, `InfoPlist.strings`). When the stamp matches and the executable exists, install leaves the bundle untouched.
- A new compiler producing a different binary changes the stamp → one more prompt. Acceptable; documented.

## Names

`APP_NAME` becomes "Remote Harness", the bundle `Remote Harness.app`, the executable `remote-harness`. The launchd label / `CFBundleIdentifier` `tech.doctorx.claude-remote` is kept: changing it would need migrating the LaunchAgent and would not help the prompts. The old `Claude Remote.app` (same data dir) is removed on install and uninstall.

## Fallback

No CLT, or the compile fails: the executable is `#!/bin/sh\nexec "$@"\n` (same arguments), the daemon works as today and `doctor` shows that folder prompts name "node", with the hint to install the CLT and run `remote-harness service install`.
