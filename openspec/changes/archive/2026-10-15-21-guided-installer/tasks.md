## 1. Wizard

- [x] 1.1 Extract the `install` routine into `features/setup/install.ts` and reuse it in the command; verify with the existing tests
- [x] 1.2 Pure profile logic (detection, suggestions, alias validation, config merge); verify with tests
- [x] 1.3 Logo and theme in the Claude Code style; verify with a width test and visually
- [x] 1.4 Interactive `setup` command and `--yes`; verify by running with a temporary HOME

## 2. One-line installation

- [x] 2.1 `install.sh` (prerequisites, code, build, wizard via `/dev/tty`); verify with `bash -n` and a full installation in a temporary HOME
- [x] 2.2 README (en/pt-BR) with the one-line command; verify by reading it

## 3. App

- [x] 3.1 First-time setup walkthrough reachable from the pairing screen; verify with typecheck, a content test and in the simulator

## 4. Website

- [x] 4.1 Redirect on `maarkn.dev` (`next.config.ts`) with a test; verify with the test and `next build`
