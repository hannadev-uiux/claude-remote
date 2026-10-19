# 71 · macOS: folder access prompts name Remote Harness, not node

## Why

On macOS the privacy prompt for a protected folder (Documents, Desktop, Downloads, volumes) says **"node" would like to access files…** (#66). The LaunchAgent runs the executable of the app bundle, but that executable is a shell script that `exec`s node, so after the `exec` the process image is node and TCC attributes the access (and the grant) to the shared node binary. The user does not know what "node" is, and the grant applies to every Node script.

## What Changes

- The bundle's executable becomes a tiny compiled launcher (C, built with the Command Line Tools on install, cached by source hash). It **spawns** the program given in its arguments as a child, forwards SIGTERM / SIGINT / SIGHUP / SIGQUIT / SIGUSR1 / SIGUSR2, and exits with the child's status. The bundle stays the responsible process, so node and the tools it runs (`tmux`, `rg`…) are attributed to "Remote Harness".
- The launcher takes the program from the LaunchAgent's `ProgramArguments` (`<launcher> <node> <cli.js> start --wait-tailscale`), so the bundle holds no paths. Its contents only change when the launcher source, the icon or the texts change; a stamp of those inputs skips the rebuild on `service install` / `update`, keeping the ad-hoc signature (and the grants keyed by it) stable.
- Without the Command Line Tools (`xcode-select -p` fails) the bundle falls back to a generic `exec "$@"` script, as today, and `doctor` says how to fix it.
- The bundle is renamed **Remote Harness** (`~/.remote-harness/Remote Harness.app`, executable `remote-harness`); the old `Claude Remote.app` is removed on install and uninstall. The label / bundle id `tech.doctorx.claude-remote` stays, so the LaunchAgent is replaced in place.
- `Info.plist` gets the folder usage descriptions (Documents, Desktop, Downloads, removable and network volumes), translated to pt-BR, en-US and es-ES through `InfoPlist.strings`.
- `doctor` (macOS) reports whether the bundle runs the compiled launcher and, informationally, that Full Disk Access can be granted to "Remote Harness" instead of per-folder prompts.

## Impact

- `apps/daemon/macos/launcher.c` (new), `src/infra/native-build.ts` (new: compile C with the CLT), `src/features/service/launchd.ts`, `src/core/paths.ts`, `src/cli.ts` (doctor), `src/core/i18n/*.ts`, tests.
- Specs: `daemon-service` (MODIFIED Login item identity, ADDED Folder access attribution).
- Installs that already granted access to node are asked once more, now for "Remote Harness".
