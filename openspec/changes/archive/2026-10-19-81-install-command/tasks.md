## 1. Worker

- [x] 1.1 `apps/web/src/install.ts`: `classifyInstallClient`, `installOs`, `parseRef`, `installScript` (default ref written into the bundled scripts); Vitest with curl, wget, PowerShell 5.1/7, browsers on each OS, phones, unknown, and the substitution over the real files
- [x] 1.2 Routes `/install`, `/install.sh`, `/install.ps1` (with `?ref=`), script responses (headers, HEAD, 400) in `index.ts`; route tests
- [x] 1.3 Install page (detected command first, the others collapsed, copy buttons, three languages) and the new commands in the landing; catalog parity and render tests

## 2. Installers

- [x] 2.1 `install.ps1`: `-Ref` downloads `https://remoteharness.app/install?ref=<ref>`; messages and header comments with the single commands
- [x] 2.2 `install.sh`: messages and header comments with the single commands (Git Bash / MSYS / Cygwin already stop with the PowerShell command); `bash -n` and the daemon's sourcing test

## 3. Everywhere else

- [x] 3.1 App setup guide: the command, the Windows command in the step text, the share action sends the install link (three languages); store texts; tests
- [x] 3.2 Daemon Windows hint (three catalogs) and its test
- [x] 3.3 README (en, pt-BR), docs pages (three languages), current specs mentioned in this change; `pnpm check` and `openspec validate --strict`
