## 1. Platform layer

- [ ] 1.1 `infra/platform.ts` and early failure on unsupported systems; verify with tests
- [ ] 1.2 `ServiceManager` with launchd (existing) and systemd user implementations, linger; verify with tests (rendered unit, commands)
- [ ] 1.3 `SecretToolTokenStore` with fallback to the file store; verify with tests
- [ ] 1.4 Shell PATH in zsh/bash with backup and atomic write; verify with tests

## 2. CLI, setup and texts

- [ ] 2.1 `doctor`, `service`, setup and texts platform-aware (all three languages); verify with tests

## 3. Installer and CI

- [ ] 3.1 `install.sh` on Linux (apt/dnf/pacman/zypper/brew); verify with `bash -n` and a run in an Ubuntu container
- [ ] 3.2 CI matrix with `ubuntu-latest` for the daemon; README; verify the workflow syntax
