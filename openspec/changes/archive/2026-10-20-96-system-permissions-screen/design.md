## Context

See `proposal.md` for the motivation. Three existing pieces this design builds directly on:

- `apps/daemon/src/features/lifecycle/service.ts`'s `LifecycleService.projects(profileId)` already returns each profile's recently-used directories; the folder-access check reuses that list rather than inventing a second notion of "recent folders."
- `apps/daemon/src/core/secrets.ts`'s `selectTokenStore()` already picks, per platform, between `KeychainTokenStore` (macOS, via the `security` CLI), `SecretToolTokenStore` (Linux Secret Service, via `secret-tool`) and `FileTokenStore` (plain file, the fallback). The Keychain-access row derives its status from which of these is actually in use and whether it works — it does not probe the OS Keychain independently.
- `apps/daemon/src/infra/desktop.ts`'s `Desktop` already runs `osascript` for notifications and for driving terminal apps (`listRunningApps`, `runInTerminal`, `#248`'s "Open in terminal"). The Accessibility/Automation check adds one more narrowly-scoped `osascript` call in the same style; it does not change `Desktop`'s existing methods.
- There is already a `features/permissions` directory in both the daemon and the app, but it is the tool-call approval feature (Allow/Deny/Always on a session's `Bash(...)`, file edits, etc.) — a completely different concept from OS-level permissions. This change's feature lives at `features/system-permissions` on both sides to avoid any naming collision or confusion with that existing code.

## Goals / Non-Goals

**Goals:**
- One screen that honestly reports what each permission's status is, with no fabricated states.
- Reuse existing project data (recent folders, the token-store selection) instead of re-deriving it.
- Keep every status classification a pure, Vitest-tested function; only the actual OS calls (`fs.readdir`, `osascript`, the Expo permission APIs) are side effects.

**Non-Goals** (restated from proposal.md for design purposes):
- Desktop notification authorization status, Live Activities / Android's ongoing notification, and Background refresh are not checked — see proposal.md's Non-goals section for why each is out of scope.
- No change to how the tool-call permission feature (`features/permissions`) works; the two features are unrelated beyond sharing the word "permissions."

## Decisions

**Protocol shape**: `machine.permissions` (client, no payload) → `machine.permissions.results { permissions: MachinePermission[] }`, where `MachinePermission = { id, status, entries? }` and `entries` (only on `folderAccess`) is `{ path, status }[]`. A dedicated typed reply over reusing `ack` — matches this project's existing convention (`worktree.inspect` → `worktree.info`, etc.) and lets the app render the list without casting an untyped `data` record. `status` is a shared enum (`allowed | denied | not_asked | limited | not_available`) used by both the phone and computer sides, so the screen's row-rendering logic doesn't need two parallel status types.

**Folder access reports one entry per folder, not one aggregate row.** The issue explicitly asks to see per-folder status (a user with ten project folders needs to know *which one* is broken), and `fs.readdir` is cheap enough to run per folder on each request (a handful of folders, not hundreds — `LifecycleService.projects` already caps recent directories at `MAX_PROJECTS` = 30). Alternative considered: one aggregate "Folder access" status — rejected, it can't tell the user which folder to fix.

**Full Disk Access is a heuristic, not a real TCC query**, because reading `TCC.db` requires Full Disk Access itself (circular) and `tccutil` only resets permissions, it does not report them. Deriving it from whether `~/Desktop`, `~/Documents` and `~/Downloads` are all listable is the same approach the issue's own proposal describes ("tccutil-free checks").

**Accessibility/Automation is checked for real**, via one `osascript` call addressing a backgroundable, always-present application (`Finder`) and classifying its exit by the well-known Apple-event-authorization error number `-1743`. This is the one computer-side permission with a reliable, side-effect-free (no dialog, no visible window) signal available from the command line — worth checking precisely rather than folding into the "not available" bucket like notifications.

**Desktop notification status is reported, not computed**, as `not_available` with explanatory copy. The honest alternative to "we can't tell you" would be silence (dropping the row entirely), but the issue's table lists it explicitly as something the user should see acknowledged, so the row stays, clearly marked as unverifiable rather than guessed. Extending the Swift tray helper to ask `UNUserNotificationCenter` for its authorization status would make this checkable for real, but that is native Swift code this environment cannot compile or test — left as a clearly-scoped follow-up (see proposal.md's Non-goals) rather than risked here.

**Local network (iOS) status is inferred from the current connection**, since no Expo or system API exposes it directly. `Allowed` when the app is presently connected to the daemon (the connection itself is proof the OS let the traffic through); `Not asked` otherwise — never `Denied`, since a failed connection has many other causes (wrong IP, daemon asleep, Tailscale down) and guessing "denied" from that would be more misleading than "not asked." This status is intentionally the weakest-confidence row on the screen; its copy says so.

**Rows for an inapplicable permission are hidden, not shown as `not_available`.** `not_available` means "this exists here but can't be determined" (e.g. desktop notifications); a permission that doesn't exist on this OS at all (Local network on Android, every computer-side TCC-ish row on Linux/WSL) has no row. Keeps the screen's two statuses ("can't tell" vs. "doesn't apply") from blurring together.

**Doctor reuses the exact same classification functions**, passing them the same kind of process-call results the daemon feature produces, so the CLI and the app can never disagree about what counts as "denied." Doctor only prints the three checks worth a human staring at a terminal before filing a bug (Folder access on the well-known folders, Accessibility/Automation, Keychain) — not a full per-recent-folder dump, which belongs on the richer screen, not a terminal health check.

## Risks / Trade-offs

- [The Local network heuristic can read "Not asked" when the real cause is something else entirely (daemon offline, wrong address)] → Mitigated by weak, explicit copy ("inferred from your current connection, not a direct check") rather than presenting it with the same confidence as the other rows.
- [Folder access makes one `readdir` per known folder on every screen open] → Bounded (at most ~30 recent folders + 3 well-known ones) and cheap (a single syscall each); no polling, only on demand when the screen is opened or refreshed.
- [Desktop notifications staying `not_available` forever could read as "the daemon gave up"] → Addressed by giving it explanatory copy instead of a bare status, and by naming the real fix (extending the tray helper) in the proposal so it's a tracked gap, not a silent one.

## Migration Plan

Single change, protocol → daemon → app → i18n, per CLAUDE.md's ordering. No data migration: the new message is additive, and the Permissions screen is a new destination (no existing route changes). Older daemons simply don't answer `machine.permissions`; the app screen should treat a timeout/`unknown_type` the same way other optional-message screens in this app already do (compute rows all as `not_available` with a note that the daemon doesn't support this check yet), consistent with the project's pattern for daemon feature detection (e.g. `directories.list`'s `unknown_type` handling in the new-session screen).
