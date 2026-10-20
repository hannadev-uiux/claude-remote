# Contributing to Remote Harness

Thanks for your interest! Bug reports, ideas, docs and code are all welcome.

## Ground rules

- Be kind — see the [Code of Conduct](CODE_OF_CONDUCT.md).
- **Security issues go to [SECURITY.md](SECURITY.md)**, never to public issues. The daemon is a remote shell; we take that seriously.
- For anything bigger than a small fix, **open an issue first** so we can agree on the approach.

## Setup

Requirements: macOS or Linux, Node 24+, pnpm 12+, tmux, git, ripgrep, zsh; Xcode on a Mac (iOS) or the Android SDK with JDK 17 (Android) for the app.

```bash
pnpm install
pnpm check                                            # typecheck + tests + Biome — must be green
pnpm --filter @remote-harness/daemon dev start --dev   # daemon from source on 127.0.0.1
pnpm --filter @remote-harness/mobile ios               # app on the iOS simulator
pnpm --filter @remote-harness/mobile android           # app on an Android emulator
```

Architecture, folder layout and conventions are in [CLAUDE.md](CLAUDE.md) — please read it before changing code.

## Workflow

1. **Specs first (OpenSpec).** Features and behavior changes start as an [OpenSpec](https://github.com/Fission-AI/OpenSpec) change in `openspec/changes/`, with a proposal, spec deltas and tasks. Validate with `openspec validate <change> --strict`. When merged, the change is archived into `openspec/specs/`. Small fixes and docs don't need a change. OpenSpec artifacts are always written in English (en-US).
2. **Branch** from `development`: `feat/<topic>`, `fix/<topic>`, `docs/<topic>`.

   | Branch | Purpose |
   |---|---|
   | `development` | Integration branch. Every PR targets it. |
   | `main` | Stable releases only, merged from `development` and tagged (`vX.Y.Z`). The one-line installer installs from `main`. |

   Urgent fixes to a release may branch from `main` as `hotfix/<topic>` and are merged back into `development` too.
   When a release only changes app JavaScript, it can also go out over the air: publish it with `ota:publish` (see [App updates over the air](#app-updates-over-the-air)). Releases that add native modules need a new build.
3. **Code** following the conventions:
   - Strict TypeScript, no `any` — `unknown` + Zod at the edges.
   - New WebSocket message? Schema in `packages/protocol` → handler in the daemon → usage in the app.
   - Pure logic (parsers, selectors, detectors) in separate functions with Vitest tests; side effects live in `infra/` (daemon) and `core/` (app) and are injected.
   - Only `features/transcript/parser.ts` knows the Claude Code `.jsonl` format; TUI labels live in one tested table.
   - Writes to user files are read → merge → backup → atomic write, and idempotent.
   - Native app dependencies are added with `npx expo install`.
   - UI text always goes through i18n with typed catalogs in `pt-BR`, `en-US` and `es-ES` (same keys in all three, checked by tests); code and identifiers are English.
4. **Test.** `pnpm check` must pass. Add tests for new logic; describe manual checks (simulator, real tmux session) in the PR.
5. **Commit** with [Conventional Commits](https://www.conventionalcommits.org/) in English:

   ```
   feat(daemon): add per-profile mute
   fix(mobile): keep composer above the keyboard
   docs: clarify Tailscale setup
   ```

   Types: `feat`, `fix`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`, `chore`. Scopes: `daemon`, `mobile`, `protocol`, `openspec`.
6. **Open a PR against `development`** using the template. Keep it focused; screenshots or a short video for UI changes are much appreciated.

## Building and releasing

The user guide lives in the [docs](https://remoteharness.app/docs/). This part covers what only matters when you build the app yourself, run your own push relay or publish updates.

### The app on your phone

Expo Go is not enough (the app uses native modules): you need Xcode on a Mac for iOS, or Android Studio / the Android SDK (JDK 17) for Android 10+.

```bash
cd apps/mobile
pnpm ios             # expo run:ios — development build on the simulator or a connected iPhone
pnpm android         # expo run:android — development build on an emulator or a connected Android phone
pnpm build:android   # release APK built locally (eas.json also has development/preview/production profiles)
```

Open the app, scan the QR code from `remote-harness pair`, and you are in. On a simulator without Tailscale, run `remote-harness start --dev` (binds to `127.0.0.1`) and `remote-harness pair --dev`; on the Android emulator also run `adb reverse tcp:7337 tcp:7337` so its `127.0.0.1` reaches the computer.

### Makefile shortcuts

`make` lists them all:

- `make install`, `make check`, `make daemon-dev`, `make ios-dev` / `make android-dev` (development builds).
- `make install-ios` / `make install-android`: release build on a connected phone or iPad (`DEVICE="…"` chooses it). `install-ios` first checks that Xcode can reach the iPhone; `make ios-devices` lists them. With several Apple teams on the Mac, set `APPLE_TEAM_ID=…` in `apps/mobile/.env.local` so builds are always signed by the same one.
- `make install-ios-link`: the same release build, installed from a Safari link served over Tailscale, so the iPhone needs no cable and can be on any network. It must already be registered in the Apple team, and the tailnet needs HTTPS certificates enabled. Tailscale cannot serve a folder on macOS, so a small server on `127.0.0.1` keeps running behind `tailscale serve`.
  - With `IOS_LINK=web` the build is copied over SSH to the site's server instead (`REMOTE_HARNESS_WEB_SSH=user@host`) and the link is `https://remoteharness.app/app/<token>/`, so the phone needs no Tailscale. The random token in `IOS_LINK_DIR/.web-token` is the only protection, since a development-signed IPA lists the registered devices.
- `make install-android-link`: release APK on the same link and token (needs the Android SDK). Build it from the same machine every time: the APK keeps that machine's release signing, and a newer one then installs over the previous one. The page shows the iPhone button to iPhones and iPads, the APK to Android phones, and both plus a QR code to a desktop browser, with "Not your device? Show all options" always there. Links printed before as `/ios/<token>/` keep working.
- `make publish-ota` (`CHANNEL=production|development`, `PLATFORM=ios|android`, key in `OTA_KEY`, default `~/.remote-harness-keys/private-key.pem`, or `~/.claude-remote-keys` when only that one exists; token in `REMOTE_HARNESS_UPDATES_TOKEN`) and `make publish-ota-dry`, which exports and signs without uploading.

```bash
pnpm --filter @remote-harness/mobile icons              # regenerate icon/splash
pnpm --filter @remote-harness/mobile xterm              # regenerate the terminal HTML
```

### Push notifications in your own build

1. In one Firebase project, create the apps you need with the id `tech.doctorx.clauderemote`: an iOS app (upload your APNs key) and/or an Android app. iOS needs a paid Apple Developer account.
2. Put `GoogleService-Info.plist` (iOS) and/or `google-services.json` (Android) in `apps/mobile/` (both git-ignored) and run `pnpm ios` / `pnpm android` again (after `npx expo prebuild --clean` when `ios/` already exists). Firebase is only linked on a platform when its file exists.
3. Choose how the daemon sends:
   - **Push relay** (no credential on the computer): build the app with `REMOTE_HARNESS_PUSH_RELAY_URL` pointing to your relay (see below). The app gets a *grant* from the relay (its FCM token, sealed) and hands it to the daemon, which posts each notification to the relay. A daemon can only reach the phones paired with it.
   - **Self-hosted**: save the Firebase service account to `~/.remote-harness/firebase-service-account.json` and restart the daemon. It sends to FCM directly, and wins over the relay when both exist.

**Live status** uses the same Firebase setup. On iOS the Live Activity updates go through FCM, which needs the APNs **authentication key** (`.p8`) in Firebase, not a certificate. On Android notifications use the high-priority `claude-remote` channel.

What the notifications and the relay carry is described in the docs: [notifications](https://remoteharness.app/docs/using-the-app/#notifications-and-mute) and [what leaves your machine](https://remoteharness.app/docs/security/#what-leaves-your-machine).

### Deploying the push relay

`apps/push-relay` is a Cloud Function in `southamerica-east1`. It needs the **Blaze** plan; FCM is free and personal use stays within the free tier of Cloud Functions.

```bash
npx -y firebase-tools@15 login
openssl rand -hex 32 | npx -y firebase-tools@15 functions:secrets:set GRANT_KEY --project <project-id> --data-file=-
make deploy-push-relay PROJECT=<project-id>
```

The function runs with the project's default credentials, so no service account key is created. Use the URL printed by the deploy (`…/pushRelay`) as `REMOTE_HARNESS_PUSH_RELAY_URL` when building the app. The project's own builds use `https://push.remoteharness.app` instead, a Cloudflare Worker (`apps/push-edge`, `cf deploy`) in front of the function, so the relay can move without new builds. Rotating `GRANT_KEY` invalidates every grant; apps fetch new ones on their next connection.

**App Check** is verified on `/grant` but only logged at first (`APP_CHECK=monitor`), so the relay works before App Check is set up. After registering the apps in Firebase App Check (DeviceCheck key on iOS; Play Integrity on Android, which needs the app in the Play Console), create `apps/push-relay/.env.<project-id>` with `APP_CHECK=enforce` and deploy again: grants then require a valid App Check token. Development builds use the debug provider; register the debug token printed in the native logs.

### Error reports

With Firebase in the build, error reports go to **Firebase Crashlytics** in the same project as push, as each user chooses in Settings → Error reports (what a report contains is in the [privacy policy](https://remoteharness.app/docs/privacy/)). Crashlytics collection is off in the native config (`apps/mobile/firebase.json`) and is only turned on by "Send automatically"; Send is hidden with "Never" and in builds without Firebase. JS stacks reference the bundle by OTA update id; symbolicate them with the source maps of that update's `expo export`.

### App updates over the air

Builds are created without an update server, so updates are off. To ship JavaScript changes without rebuilding on each phone, the app uses a self-hosted [Expo Updates](https://docs.expo.dev/technical-specs/expo-updates-1/) server: the project's, at `remoteharness.app/api/updates` (no EAS account or fees), or any other implementation of the protocol.

1. **Signing key, once.** `cd apps/mobile && npx expo-updates codesigning:generate --key-output-directory ~/.remote-harness-keys --certificate-output-directory certs --certificate-validity-duration-years 10 --certificate-common-name "Remote Harness"`. Commit `certs/certificate.pem`; keep the private key out of the repo (and backed up: losing it means a new build for every phone).
2. **Build** with the server URL, e.g. in `apps/mobile/.env.local` (git-ignored, read by the build and the publisher):
   ```dotenv
   REMOTE_HARNESS_UPDATES_URL=https://remoteharness.app/api/updates/manifest
   ```
   The server is the site in `apps/web` (see [Website](#website)), with the update files in its data folder; it implements the protocol itself and never holds the signing key. Asset URLs signed into each update default to `<updates base>/assets/`; `REMOTE_HARNESS_UPDATES_ASSETS_URL` changes that prefix for another server.
   A custom URL without `certs/certificate.pem` is refused. The URL is part of the runtime version, so it never changes for installed builds. Builds made before the rename with `https://maarkn.dev/api/claude-remote/updates/manifest` are answered by that old server until they are replaced. (`EAS_PROJECT_ID=<id>` uses EAS Update instead; code signing there needs a paid plan.)
3. **Publish** a JavaScript change:
   ```bash
   REMOTE_HARNESS_UPDATES_TOKEN=… REMOTE_HARNESS_UPDATES_KEY=~/.remote-harness-keys/private-key.pem \
     pnpm --filter @remote-harness/mobile ota:publish          # --platform ios|android, --dry-run
   ```
   It runs `expo export`, signs one manifest per platform locally and uploads only the files the server does not have yet. The token is `UPDATES_TOKEN` in the site's `.env` on its server (generated by the first `make deploy-web`).

**Channels.** Builds follow `production`, published by hand (`make publish-ota`, or `CHANNEL=…`). Every merge into `development` that touches the app is published to the `development` channel by the *OTA (development)* workflow; Settings → App → channel switches a phone to it (and back). The workflow needs two repository secrets: `OTA_SIGNING_KEY` (the private key PEM) and `OTA_DEV_TOKEN` (the site's `UPDATES_DEV_TOKEN`, which can only publish to `development`). Without them it does nothing. If builds pin `APPLE_TEAM_ID`, set the same value as the repository variable `APPLE_TEAM_ID` (it is part of the runtime version).

Updates only reach builds with the same native code (fingerprint runtime version): a release that adds native modules still needs a new build.

### Screenshots

The README screenshots come from the demo: the real daemon in a throwaway environment full of fictional sessions (its own data home, token, ports, tmux server and `HOME`; on macOS under `/Users/Shared`, so paths show as `~/code/…`). Nothing real shows up in it.

```bash
pnpm --filter @remote-harness/daemon demo           # prints a remoteharness://pair link; Ctrl+C removes everything
pnpm --filter @remote-harness/daemon demo --clean   # after an interrupted run
```

Install a Release build on the simulator (`cd apps/mobile && npx expo run:ios --configuration Release`, so the dev menu stays out of the shots), set the dark appearance and a clean status bar (`xcrun simctl ui booted appearance dark`, `xcrun simctl status_bar booted override --time 9:41`), open the pair link with `xcrun simctl openurl booted '<link>'`, and move between screens with links such as `remoteharness://session/<id>`, `…/terminal`, `remoteharness://new` and `remoteharness://settings`. Save the shots with `xcrun simctl io booted screenshot <name>.png` in one folder, then:

```bash
pnpm --filter @remote-harness/mobile screenshots <folder>   # half size, palette PNGs, into docs/screenshots
```

### Website

`remoteharness.app` (landing, docs, installers, the updates server and the install links) is `apps/web`, bundled by Vite into one Node file and run in Docker behind the server's Traefik (`apps/web/deploy/`: external `web` network, Let's Encrypt resolver `le`). `pnpm --filter @remote-harness/web dev` runs it on `localhost:8080` with a local `data/` folder. The docs pages are Markdown in `apps/web/content/<locale>/`.

```bash
REMOTE_HARNESS_WEB_SSH=root@<server> make deploy-web    # build, copy over SSH, docker compose up --wait
```

The server keeps `.env` (the publish tokens `UPDATES_TOKEN` and `UPDATES_DEV_TOKEN`, generated by the first deploy) and `data/` (`updates/` and the install links in `app/<token>/`) next to the compose file, in `REMOTE_HARNESS_WEB_DIR` (default `/srv/remote-harness-web`). `push.remoteharness.app` is a separate Cloudflare Worker (`apps/push-edge`, `cf deploy`) in front of the push relay.

## Reporting bugs

Use the bug report template and include `remote-harness doctor` output, versions (macOS, Node, Claude Code, iOS) and daemon logs from `~/.remote-harness/logs` — **redact tokens and session content**.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
