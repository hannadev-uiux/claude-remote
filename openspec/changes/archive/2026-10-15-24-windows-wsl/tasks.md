## 1. Windows installer

- [x] 1.1 `install.ps1` (checks, WSL install, Linux installer inside WSL, three languages); verify with PSScriptAnalyzer/`pwsh -NoProfile -Command` parse and a dry run
- [x] 1.2 Redirect `maarkn.dev/claude-remote/install.ps1`; verify with the redirect test (maarkN/maarkn.dev#3)

## 2. Daemon on WSL

- [x] 2.1 WSL detection; verify with tests
- [x] 2.2 Networking checks and `.wslconfig` merge; verify with tests
- [x] 2.3 systemd in WSL and the logon task in the setup/service; verify with tests (commands)
- [x] 2.4 `doctor` and texts for WSL (three languages); README Windows section
