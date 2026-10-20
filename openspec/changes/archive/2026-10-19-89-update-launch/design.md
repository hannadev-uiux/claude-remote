## Context

- `registerUpdatesFeature` keeps `let updating = false`. `launch(onFailure)` returns `false` when `updating`, when the source is not the installer's checkout, when there is no CLI path or when nothing is available. Otherwise it sets `updating = true` and spawns `remote-harness update` detached, with an `onExit` that only acts on a non-zero code.
- `RemoteUpdates.begin()` writes a new run record (`fetching`) first, then calls `launch`. A `false` becomes `failed(null)`: the record turns `failed` with `updater exited (error)`, and the request rejects with `internal` "could not start the update".
- `UpdateChecker` persists `{ channel, checkedAt, available, notifiedCommit }` in `paths.updates()` and loads it at start. A check fetches the channel and compares `FETCH_HEAD` with `HEAD` (`SourceUpdater.fetch`). The CLI uses the same call before updating.

## Goals / Non-Goals

**Goals:** a later update always starts after an updater that exited 0; an offer never names the commit already installed; refusals are explained and not recorded as failures; the same-version label.

**Non-Goals:** a protocol field for the refusal reason. The reasons are stable English messages that the app maps, falling back to the text.

## Decisions

- **Exit handling.** `onExit(code)` always sets `updating = false` and refreshes the menu. On a non-zero code it keeps the current behavior (`failedCommit`, `onFailure`). Under systemd, the code is the one of `systemd-run`, which returns as soon as the unit started. So "an update is running" is also derived from the run record: `RemoteUpdates.running()` is true while the recorded run is unfinished and recent.
- **Finished without a restart.** When a followed run record reaches `done` or `failed` and this daemon is still running, `RemoteUpdates` calls `onFinished(run)`. The update did not replace the daemon ("Already up to date", or a failure), so the feature clears `updating`, logs "update finished without a restart" and calls `checker.recheck(channel)`. That method runs a check now, ignoring both the due time and the forced-check rate limit, then broadcasts. This works the same with and without systemd, and it never runs a `git fetch` while the updater still uses the checkout.
- **Stale state on load.** `UpdateCheckerDeps` gains `head: () => Promise<string | null>` (`SourceUpdater.head`). `load()` clears `available` when `available.commit === head`, and saves the cleaned state. The background check then runs as usual.
- **Refusal before recording.**
  - `launchRefusal(): 'running' | 'not-installer' | 'nothing' | null` is a pure function of `updating`, the source/CLI path and the checker state. It is exported for tests.
  - `RemoteUpdates` gets `refusal: () => LaunchRefusal | null`.
  - `daemon.update.start` asks for the refusal after any channel change and check, and rejects with `bad_request`:
    - `running` → "an update is already running";
    - `not-installer` → "cannot update: not-installer";
    - `nothing` → "already up to date".
  - `begin()` (also used by the tray and automatic updates) returns `false` on a refusal without writing a run.
- **Spawn failure.** `launch` returns `{ ok: true } | { ok: false; error: string }`. `begin()` records a failed run with "could not start the updater: <error>", and the request rejects with `internal` and that text.
- **App.** `availableLabel(available, current, t)` returns `t('daemonUpdate.newCommits', { version, commit })` when the version is unchanged, and the version otherwise (the bare commit when the version is unknown). `updateStartError(message, t)` maps the three refusal messages to translated texts and leaves any other message as it is.

## Risks / Trade-offs

- A recheck right after an "up to date" run costs one `git fetch`. It only happens on that path.
- Mapping English messages in the app couples it to the daemon's wording. The texts are named in the spec and covered by tests on both sides, and an unknown text still shows as is.
