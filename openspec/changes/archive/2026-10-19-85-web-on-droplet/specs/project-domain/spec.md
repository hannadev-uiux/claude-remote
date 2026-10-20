## MODIFIED Requirements

### Requirement: Updates server
`https://remoteharness.app/api/updates/` SHALL be the Expo Updates server of the app, answered by the site server from its data directory as the `updates-server` and `web-hosting` capabilities describe, with no request forwarded to another site. The URL builds are made with (`https://remoteharness.app/api/updates/manifest`) MUST stay the same, since it is part of their runtime version.

#### Scenario: Manifest request
- **WHEN** a build made with `REMOTE_HARNESS_UPDATES_URL=https://remoteharness.app/api/updates/manifest` checks for updates
- **THEN** it receives the server's manifest for its runtime and channel

#### Scenario: No other site
- **WHEN** the app or the publisher talks to `/api/updates/*`
- **THEN** the site server answers it without contacting `maarkn.dev` or any other origin

### Requirement: iPhone install link
`make install-ios-link IOS_LINK=web` and `make install-android-link` SHALL upload their build (`RemoteHarness.ipa` with its `manifest.plist`, or `RemoteHarness.apk`) and a `builds.json` entry with the version, build and date over SSH to the same folder `app/<token>/` in the site server's data directory (`REMOTE_HARNESS_WEB_SSH`, `REMOTE_HARNESS_WEB_DIR`), each file under a temporary name renamed into place and `builds.json` last, where `<token>` is random and reused between builds, and print `https://remoteharness.app/app/<token>/`. The site server SHALL answer `/app/<token>/` and `/ios/<token>/` with the install page, serve only `RemoteHarness.ipa`, `RemoteHarness.apk` (as `application/vnd.android.package-archive`) and `manifest.plist` under a token, and MUST answer 404 to anything else. A folder without `builds.json` SHALL keep being answered with its uploaded `index.html`.

#### Scenario: Install without Tailscale
- **WHEN** a registered iPhone opens the printed link in Safari and taps Install
- **THEN** the build installs over any network

#### Scenario: Unknown path
- **WHEN** someone requests `/ios/` or a token that does not exist
- **THEN** the site server answers 404

#### Scenario: Android build
- **WHEN** `make install-android-link` finishes and an Android phone opens the link and taps Download
- **THEN** it downloads `RemoteHarness.apk` with the Android package content type

#### Scenario: Link published before
- **WHEN** a folder has only the `index.html` uploaded by an older publisher
- **THEN** `/ios/<token>/` still shows that page

#### Scenario: Host not configured
- **WHEN** a web install link is published without `REMOTE_HARNESS_WEB_SSH`
- **THEN** the publisher stops before building, naming the variable
