## Why

In Settings → Computer, "Update the computer" fails at once: "The update failed: updater exited (error)" and "could not start the update" (issue #225). `update.log` is empty for that attempt, and the run goes from start to `failed` in 6 ms.

`launch()` refuses without spawning anything while the in-memory flag `updating` is `true`. That flag is only reset when the updater exits with an error. A successful update is expected to restart the daemon, but the updater can exit 0 without a restart: it does that when it finds the checkout "Already up to date". From then on `updating` stays `true` for the life of the process. Every later update is refused, and `RemoteUpdates.begin()` records the refusal as a failed updater run.

The run reached "Already up to date" because the checker's state is saved on disk and survives the update's own restart. The new daemon loads "commit X is available" while its checkout already is at X, and offers it again. The checker and the CLI already compare the same thing: the channel's commit against `HEAD`, through `SourceUpdater.fetch`. Only the stale state was out of step.

## What Changes

- **`updating` is reset whenever the updater exits** and this daemon is still running. On exit code 0 the daemon checks the channel again right away, bypassing the rate limit, so the info matches the checkout.
- **No stale offer**: on load, the checker drops an `available` whose commit is the checkout's `HEAD`.
- **Refusals say why and record nothing.** Before recording a run, the daemon checks whether it can start and replies with the reason:
  - "an update is already running";
  - "cannot update: not-installer";
  - "already up to date".
  
  Only a failure to spawn the updater records a failed run, with its error message instead of "updater exited (error)".
- **App**:
  - known refusal reasons are translated;
  - an update with the same version and a newer commit reads "0.13.0 · new commits (bcf5378)".

## Capabilities

### Modified Capabilities
- `desktop-updates`: background update check (no stale offer), update from the app (refusal reasons, no failed run for a refusal, `updating` reset, the app's texts).

## Impact

`apps/daemon`: `features/updates/index.ts` (refusal reasons, exit handling), `remote.ts` (pre-check, error messages), `checker.ts` (`head` dep, `recheck`), tests. `apps/mobile`: `daemon-update/view.ts` (label, reason mapping, tests), card, i18n in three catalogs. No protocol change.
