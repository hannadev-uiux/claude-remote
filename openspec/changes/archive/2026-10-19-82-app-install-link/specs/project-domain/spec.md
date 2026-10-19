## MODIFIED Requirements

### Requirement: iPhone install link
`make install-ios-link IOS_LINK=web` and `make install-android-link` SHALL upload their build (`RemoteHarness.ipa` with its `manifest.plist`, or `RemoteHarness.apk`) and a `builds.json` entry with the version, build and date to the same R2 folder `<token>/`, where `<token>` is random and reused between builds, and print `https://remoteharness.app/app/<token>/`. The Worker SHALL answer `/app/<token>/` and `/ios/<token>/` with the install page, serve only `RemoteHarness.ipa`, `RemoteHarness.apk` (as `application/vnd.android.package-archive`) and `manifest.plist` under a token, and MUST answer 404 to anything else. A folder without `builds.json` SHALL keep being answered with its uploaded `index.html`.

#### Scenario: Install without Tailscale
- **WHEN** a registered iPhone opens the printed link in Safari and taps Install
- **THEN** the build installs over any network

#### Scenario: Unknown path
- **WHEN** someone requests `/ios/` or a token that does not exist
- **THEN** the Worker answers 404

#### Scenario: Android build
- **WHEN** `make install-android-link` finishes and an Android phone opens the link and taps Download
- **THEN** it downloads `RemoteHarness.apk` with the Android package content type

#### Scenario: Link published before
- **WHEN** a folder has only the `index.html` uploaded by an older publisher
- **THEN** `/ios/<token>/` still shows that page

## ADDED Requirements

### Requirement: Device-aware install page
The install page SHALL show the iOS install button to iPhones and iPads (iPadOS Safari included), the APK download to Android devices, and both options plus a QR code of the page to desktop and unknown browsers, each with its version and build date and its install hints, in the negotiated language (pt-BR, en-US, es-ES). A "Not your device? Show all options" link MUST always be offered and work without JavaScript. A platform without a published build SHALL be shown as not published, without a download button. The page MUST NOT load external resources, MUST be `noindex`, uncached and sent with `referrer-policy: no-referrer`.

#### Scenario: iPhone
- **WHEN** an iPhone opens the link
- **THEN** the iOS install button and the registered-device and Developer Mode hints are shown, and the Android card is hidden

#### Scenario: Desktop
- **WHEN** a Mac or Windows browser opens the link
- **THEN** both cards and a QR code of the page are shown

#### Scenario: Not your device
- **WHEN** the visitor taps "Not your device? Show all options"
- **THEN** every option and the QR code are shown

#### Scenario: Android not published
- **WHEN** only the iOS build was ever published and an Android phone opens the link
- **THEN** the Android card says the build is not published yet and the iOS option is one tap away
