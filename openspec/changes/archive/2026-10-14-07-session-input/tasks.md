## 1. Input

- [x] 1.1 Implement `InputService.sendText` with a named buffer, bracketed paste, wait and Enter, plus a per-session queue; verify with a test of the generated tmux commands and their order
- [x] 1.2 Implement `sendKey` with the allowlist; verify with tests for a valid and an invalid key
- [x] 1.3 Register the `session.input` and `session.key` handlers with `not_controllable` and `too_large` checks; verify with a WS test
- [x] 1.4 Manually validate against a real tmux session with a multi-line prompt and `@`; record the result in `tasks.md`

> Validation 1.4 (2026-10-14): a test TUI with bracketed paste enabled in an isolated tmux received
> `ESC[200~line 1\rline 2 @src/a.ts /model ESC[201~` followed by `\r` (Enter); `Escape` and `BTab` (`ESC[Z`)
> arrived correctly. Validation against the Claude Code TUI is left for the first real use.
