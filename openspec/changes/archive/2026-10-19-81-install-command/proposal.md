## Why

There are two install commands and the user has to pick the right one (issue #131): `curl -fsSL https://remoteharness.app/install.sh | bash` on macOS, Linux and WSL, and `irm https://remoteharness.app/install.ps1 | iex` in Windows PowerShell. Running the wrong one, or opening the URL in a browser, only ends in an "unsupported system" message or a raw script. The installers are also only redirects to `raw.githubusercontent.com` on `main`, so the query options people expect (`?ref=development`) are lost and the site depends on GitHub's raw host at install time.

## What Changes

- **One install URL**, `https://remoteharness.app/install`, answered by the `apps/web` Worker from the client:
  - `curl`, `wget` and unknown clients get `install.sh` (which already tells macOS, Linux and WSL apart);
  - Windows PowerShell 5.1 and PowerShell 7 (`irm` / `iwr`) get `install.ps1`;
  - browsers get an HTML page in their language that detects the operating system, shows its one-liner with a copy button and keeps the other systems one tap away.
- **The scripts are served by the Worker**, bundled at build time from the commit that is deployed (`text/plain; charset=utf-8`, `no-cache`), instead of a redirect to GitHub. `?ref=<branch|tag>` sets the default version the script installs (the same as `--ref` / `REMOTE_HARNESS_REF`). `/install.sh` and `/install.ps1` keep working with the same content and query.
- **Single command per platform everywhere**: README (both languages), the landing install section, the docs, the app's setup guide, the daemon's Windows hint, `install.sh` / `install.ps1` messages and the store texts show `curl -fsSL https://remoteharness.app/install | bash` and `irm https://remoteharness.app/install | iex`.
- `install.ps1 -Ref <ref>` downloads `install.sh` from `https://remoteharness.app/install?ref=<ref>` instead of the raw GitHub URL.
- `install.sh` started from Git Bash, MSYS or Cygwin on Windows prints the PowerShell command (it already stopped there; the message now shows the single command).

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `project-domain`: installer URLs (one `/install`, served instead of redirected).
- `web-landing`: install section and the Worker's other paths.
- `guided-installer`: the installer URL and the in-app guide.

## Impact

`apps/web` (routes, a client classifier, the install page, script responses, catalogs, tests), `install.sh`, `install.ps1`, `apps/mobile` (setup guide, catalogs, store texts), `apps/daemon` (Windows hint in the three catalogs), README and the docs pages. The zone's redirect rules for `/install.sh` and `/install.ps1` (and the fallback to the repository) must be removed on Cloudflare for the Worker to answer those paths; until then they keep redirecting to `main`, which installs the same thing.
