## Why

Updating Claude Remote today means running the one-line installer again, which also reopens the setup wizard (and may show the pairing QR code). A single `claude-remote update` makes updating quick and safe. (Issue #18)

## What Changes

- **`claude-remote update [--ref <ref>] [--force]`**: fetches the ref (default `main`) into the installer's checkout (`~/.claude-remote/src`); when it is already there, says it is up to date (unless `--force`). Otherwise runs the new `install.sh --update`.
- **`install.sh --update`**: same checks, fetch and build as the installer, but instead of the wizard it runs `claude-remote update --finish`, which refreshes launchers, the `claude-remote` shortcut, the PATH block and hooks (idempotent) and restarts the background service when it is installed. Prints the old and the new version.
- Refuses to update a development checkout (anything other than the installer's directory) or code with local changes.
- Messages in pt-BR, en-US and es-ES; README section.

## Capabilities

### New Capabilities

### Modified Capabilities
- `guided-installer`: update command.

## Impact

`apps/daemon` (`features/update`, CLI command, i18n catalogs), `install.sh` (`--update`), README.
