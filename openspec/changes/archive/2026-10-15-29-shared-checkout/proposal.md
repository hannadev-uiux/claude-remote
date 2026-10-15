## Why

Two Claude Code sessions can work in the same git checkout at the same time (one started from the phone, another already running in tmux). They edit the same files, one switches the branch under the other, and work is overwritten. Claude Remote knows every session's directory but says nothing, and every session it starts shares the main checkout. (Issue #56)

## What Changes

- **Checkout of a session**: the daemon resolves the git checkout (worktree root and branch) of each session's directory and sends it as `session.checkout` (`null` outside git).
- **Shared checkout warning**: the session list marks live sessions that share a checkout with another live session and shows each session's branch.
- **`checkout.inspect { profileId, cwd }`**: before starting, the app asks which checkout a directory belongs to and which live sessions are in it; the new-session screen warns and asks for confirmation when the checkout is busy.
- **Start in a worktree**: `session.start` accepts `worktree: true`; the daemon starts Claude Code with `--worktree <name>`, so the session runs in its own git worktree and branch. Offered only for git directories.
- Texts in pt-BR, en-US and es-ES.

## Capabilities

### New Capabilities

### Modified Capabilities
- `session-registry`: checkout of a session.
- `session-lifecycle`: checkout inspection and start in a worktree.
- `app-session-list`: shared checkout badge and branch.

## Impact

`packages/protocol` (`SessionSchema.checkout`, `checkout.inspect`/`checkout.info`, `session.start.worktree`, peers helper), `apps/daemon` (`infra/git.ts`, `features/checkout`, lifecycle), `apps/mobile` (session list, new-session screen, i18n catalogs).
