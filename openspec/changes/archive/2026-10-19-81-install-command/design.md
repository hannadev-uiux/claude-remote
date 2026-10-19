## Context

`apps/web` is the Worker behind `remoteharness.app`. Today it renders the landing and the docs, proxies `/api/updates/*`, serves the iPhone install link from R2 and answers `/install.sh` / `/install.ps1` with a 302 to `raw.githubusercontent.com/.../main/`. The zone's redirect rules answer those two paths before the Worker. `install.sh` (bash) detects macOS, Linux and WSL, and already stops on Git Bash / MSYS / Cygwin with a message pointing at PowerShell. `install.ps1` sets up WSL2 and runs `install.sh` inside it, from `remoteharness.app/install.sh` or, with `-Ref`, from the raw GitHub URL of that ref.

## Goals / Non-Goals

**Goals:** one URL to remember; the right script for the client without a redirect; a useful page when the URL is opened in a browser; `?ref=` honoured; the old URLs keep working.

**Non-Goals:** a POSIX `sh` installer (`install.sh` stays bash, so the command keeps `| bash`); changing what the installers do once they run; serving the scripts of arbitrary refs (the text served is the deployed one, only its default ref changes).

## Decisions

- **Client classification is a pure function** (`classifyInstallClient(userAgent, accept)` in `apps/web/src/install.ts`), tested with real user agents:
  - `PowerShell` anywhere in the user agent (`WindowsPowerShell/5.1…` and `PowerShell/7.x`; both start with `Mozilla/5.0`, so this check comes first) → `powershell`;
  - a browser: the user agent starts with `Mozilla/` or `Opera/`, or `Accept` prefers `text/html` → `browser`;
  - everything else (curl, Wget, fetch, HTTPie, no user agent) → `shell`, so a pipe to bash never receives HTML.
  The browser page picks its preselected system with `installOs(userAgent)`: Windows, macOS (not iPhone/iPad), Linux / ChromeOS (not Android), or `other` (a phone: show everything and say to run it on the computer).
- **Scripts bundled with the Worker** (`?raw` imports of the repository's `install.sh` and `install.ps1`, like the docs Markdown). The response is the deployed commit's script, always consistent with the Worker that serves it, and nothing is fetched at install time. Deploys happen from `main`, so this matches what the redirect served.
- **`?ref=`** is validated (`^[A-Za-z0-9._/-]{1,100}$`, no `..`, no leading `-` or `/`) and written into the script's default: `REF="${REMOTE_HARNESS_REF:-${CLAUDE_REMOTE_REF:-<ref>}}"` in `install.sh` and `[string]$Ref = '<ref>'` in the top-level `param()` of `install.ps1`. Environment variables and flags still win. A test runs the substitution over the real files, so renaming the anchor lines breaks the test, not the installer. An invalid ref answers 400 in plain text (a pipe to bash prints it as a command-not-found, never runs anything).
- **Headers**: `content-type: text/plain; charset=utf-8` (`irm` returns a string for `iex`; curl does not care), `cache-control: no-cache` (a new deploy is seen at once), `x-content-type-options: nosniff`, and `vary: User-Agent, Accept` on `/install` since its body depends on them. HEAD answers the same headers without a body.
- **`install.ps1 -Ref`** fetches `https://remoteharness.app/install?ref=<ref>` (curl inside WSL is a shell client), so no raw GitHub URL is left in the installers.
- **Install page**: a small page in the site's style (same head, header and footer as the docs) with the detected system's command first and a `<details>` list with the other systems' commands, each with a copy button. It works without JavaScript; the script only adds copying. `noindex` is not needed (it is a real page), and it is linked from the landing.
- **Landing**: the install section keeps its two tabs (macOS · Linux, Windows) with the new commands.

## Risks / Trade-offs

- Zone redirect rules run before Workers: until they are removed, `/install.sh` and `/install.ps1` keep the 302 to `main` (same result without `?ref=`), and `/install` falls into the repository fallback. The deploy notes say so.
- A proxy or tool that sends a browser-like user agent to a pipe would get HTML; `curl -A Mozilla…` is unusual, and `/install.sh` stays available for scripts that need it.
- The served script is the deployed one even with `?ref=`; when the installer itself changes on a branch, test it from a clone (`bash install.sh --ref <branch>`), as the docs say.
