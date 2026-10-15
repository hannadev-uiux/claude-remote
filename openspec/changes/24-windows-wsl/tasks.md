## 1. Windows installer

- [ ] 1.1 `install.ps1` (checks, WSL install, Linux installer inside WSL, three languages); verify with PSScriptAnalyzer/`pwsh -NoProfile -Command` parse and a dry run
- [ ] 1.2 Redirect `maarkn.dev/claude-remote/install.ps1`; verify with the redirect test

## 2. Daemon on WSL

- [ ] 2.1 WSL detection; verify with tests
- [ ] 2.2 Networking checks and `.wslconfig` merge; verify with tests
- [ ] 2.3 systemd in WSL and the logon task in the setup/service; verify with tests (commands)
- [ ] 2.4 `doctor` and texts for WSL (three languages); README Windows section
