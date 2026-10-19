## MODIFIED Requirements

### Requirement: App icon
The app SHALL have an icon with the Remote Harness mark (the Tether: three reins from three terminals meeting in one ring) in the amber accent over a dark gradient with a soft amber glow, generated from code by `apps/mobile/scripts/icons.mts` together with the splash image, the Android adaptive, themed and notification icons, the favicon and the Live Activity icon. Sizes under 24 px (notification, favicon, Live Activity, menu bar) SHALL use the bold weight of the mark. No asset MAY show the Claude spark or any other agent's symbol.

#### Scenario: iPhone home screen
- **WHEN** the app is installed
- **THEN** the icon shown is the amber Tether mark on the dark gradient

#### Scenario: Android themed icon
- **WHEN** the launcher applies a themed (monochrome) icon
- **THEN** the bold mark is used as the monochrome layer inside the adaptive safe zone

#### Scenario: Regenerating
- **WHEN** a developer runs `pnpm --filter @remote-harness/mobile icons`
- **THEN** every asset in `apps/mobile/assets` and the brand banner in `docs/brand` are rewritten from the same mark source
