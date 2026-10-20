## Why

The README still carries the full user guide: install per OS, setup, Linux and WSL notes, the config file, push, over-the-air updates and uninstall (issue #195). The docs at `remoteharness.app/docs` (live since v0.15.0-ALPHA) cover the same topics in three languages, so there are two copies that drift. `README.pt-BR.md` lags behind as well, and the landing's FAQ still sends readers to "the README" for sleep and lock settings.

## What Changes

- **README.md** keeps what the project is (pitch, screenshots, why, status, features, how it works), a short security summary, the one-line install, a table that links each user topic to its docs page, development, contributing and license.
- **README.pt-BR.md** is shrunk the same way, linking `/pt-br/docs/`.
- **CONTRIBUTING.md** gains a "Building and releasing" part with the developer-only topics that leave the README: building and signing the app, Makefile targets and install links, Firebase for your own builds, the push relay deploy and App Check, over-the-air publishing and channels, and the website deploy.
- **Docs:** the topics the docs did not have yet move there, in en-US, pt-BR and es-ES: `remote-harness push off` / `on` in the daemon's command table. The getting-started page points to CONTRIBUTING.md for the signing details instead of the README.
- **Landing FAQ:** the "away from home" answer links the docs' troubleshooting instead of the README, in the three languages.

## Capabilities

### New Capabilities

### Modified Capabilities
- `web-docs`: the READMEs keep the project overview and link each user topic to the docs; developer topics live in CONTRIBUTING.md

## Impact

- `README.md`, `README.pt-BR.md`, `CONTRIBUTING.md`.
- `apps/web/content/{en-US,pt-BR,es-ES}/daemon.md` and `getting-started.md`; `apps/web/src/i18n/*.ts` (landing FAQ).
- No code or protocol change.
