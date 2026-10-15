## ADDED Requirements

### Requirement: Update command
`claude-remote update [--ref <ref>] [--force]` SHALL update an installation made by the installer: fetch the ref (default `main`) into `~/.claude-remote/src`, run the new `install.sh --update` (checks, dependencies and build without the wizard), refresh launchers, shortcut, PATH and hooks idempotently, restart the background service only when it is installed, and print the old and new version. It MUST NOT ask setup questions or show the pairing code, MUST refuse a checkout other than the installer's or one with local changes, and SHALL say when the installation is already up to date.

#### Scenario: New version available
- **WHEN** the user runs `claude-remote update` and `main` has new commits
- **THEN** the code is rebuilt, the service is restarted and the CLI prints `0.3.0 → 0.3.1`

#### Scenario: Already up to date
- **WHEN** the fetched commit is the installed one
- **THEN** nothing is rebuilt and the CLI says it is up to date (unless `--force`)

#### Scenario: Development checkout
- **WHEN** the CLI runs from a clone outside `~/.claude-remote/src`
- **THEN** it refuses and suggests `git pull` and a build

#### Scenario: Installer only
- **WHEN** the user runs `curl -fsSL https://maarkn.dev/claude-remote/install.sh | bash -s -- --update`
- **THEN** the update runs the same way, without the wizard
