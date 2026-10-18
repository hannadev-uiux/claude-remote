## Why

The app talks about "the daemon" in about a dozen user-facing texts per language ("connecting to the daemon…", "No connection to the daemon.", "Token rejected by the daemon.", Settings "Daemon" / "Forget daemon", "The daemon on your computer can't receive photos…"). For most people the thing on the other end is "my computer", and the daemon already reports the computer's host name in the handshake. The redesign (#94) names it: "machine", with the host name when it is known.

## What Changes

- **Machine name** = the alias chosen in the app (stored on the device; the editing UI arrives with the Settings redesign, #157) → else the host name from the daemon's `auth.ok` → else the generic "your machine" / "sua máquina" / "tu máquina".
- **`{{machine}}` and `{{Machine}}` in the catalogs** resolve to that name automatically: `createI18n` installs a `missingInterpolationHandler` that fills the two placeholders from a small registry (`core/i18n/machine.ts`), so `errorMessage()` and every other call site keep calling `t(key)` as today; passing `{ machine }` explicitly still wins. The app keeps the registry in sync with the connection and the alias.
- **App copy** (pt-BR, en-US, es-ES): "connecting to MacBook Pro…", "Can't reach MacBook Pro.", "MacBook Pro did not respond.", "MacBook Pro rejected the pairing. Pair again.", "Couldn't connect to your machine." (pairing, before any host name is known), push diagnostics ("This phone has not registered with MacBook Pro yet", "MacBook Pro does not know this phone yet"), photos ("MacBook Pro can't receive photos yet. On the computer, run `remote-harness update`."), Settings section **Machine** (with the host name as a row) and **Forget this machine**. Messages that ask for a command keep the command and say where to run it ("On the computer, run …"); `claude-remote update` becomes `remote-harness update`.
- **System prompts** (`app.config.ts`): the camera reads "the pairing QR code shown by Remote Harness on your computer"; the local network prompt says the app "connects to your computer".
- **Out of scope, on purpose**: code identifiers (`DaemonClient`, `daemonVersion`, `apps/daemon`), the CLI (`remote-harness service`, "daemon running": the person at the terminal is managing the background process and the README names it once as the technical term) and the developer docs.

## Capabilities

### New Capabilities

### Modified Capabilities
- `product-identity`: a new "Machine wording" requirement.

## Impact

- `apps/mobile`: `core/i18n/machine.ts` (+ test), `core/i18n/create.ts`, `features/settings/machine-store.ts` (alias, `useMachineName`, sync hook), root layout, `SettingsScreen`, the three catalogs (`settings.daemon` → `settings.machine`, new `settings.name`, new `machine.*`), `app.config.ts`, `i18n.test.ts`.
- No protocol or daemon change (`host` is already in the handshake).
