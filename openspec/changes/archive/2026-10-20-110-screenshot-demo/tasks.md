## 1. Daemon

- [x] 1.1 `hostName` reads `REMOTE_HARNESS_HOST_NAME` (tests).
- [x] 1.2 `scripts/demo-data.ts`: fictional profiles, repositories, transcripts, status lines and the manifest checks (tests).
- [x] 1.3 `scripts/demo.mts`: create the sandbox, start the tmux server and the daemon, register the sessions through the hooks, keep the permission pending, print the pairing link, clean up on exit and with `--clean`; `demo` script in `package.json`.

## 2. Screenshots

- [x] 2.1 Retake the README screenshots from the demo in the dark theme (session list, conversation, permission, terminal, new session, settings, iPad), optimized PNGs.
- [x] 2.2 README header (en and pt-BR) uses them; CONTRIBUTING.md says how to retake them.

## 3. Validation

- [x] 3.1 `pnpm check` green.
