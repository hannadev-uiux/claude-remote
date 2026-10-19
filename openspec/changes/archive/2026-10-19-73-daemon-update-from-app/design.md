# Design · 73 Daemon update from the app

## Flow

```
app ──daemon.update.check──▶ daemon: (save channel) → checker.check(channel, force) → info
app ──daemon.update.start──▶ daemon: guards → write run {fetching} → runDetachedUpdate(channel)
                                     └─ poll update-run.json every 1 s → broadcast daemon.update.info
detached `remote-harness update --ref <channel>`:
   fetching → checkout → building (install.sh --update) ─fail→ rollback → failed
   └─ new CLI `update --finish`: restarting → service reinstall (daemon restarts)
new daemon start: run.step == restarting → done (to = its version) → app reconnects, checks again
```

`daemon.update.info` is both the reply and the progress broadcast; one shape keeps the app's state a single object.

## Run record

`update-run.json` (atomic writes):

```ts
{ channel, from, to, commit, step: 'fetching'|'building'|'restarting'|'done'|'failed',
  error?, rolledBack?, startedAt, finishedAt }
```

Every `remote-harness update` writes it, from the app, the tray or the terminal, so the app also shows the outcome of an update started elsewhere. On start the daemon reconciles it: `restarting` → `done`; `fetching`/`building` older than 30 minutes → `failed` (`interrupted`); otherwise it keeps polling until the updater finishes. If the updater exits non-zero without writing `failed` (crash), the daemon writes it with the exit code.

## Rollback

`update` records `HEAD` before checking out the new commit. When `install.sh --update` fails before the restart step, it checks out the old commit and runs the old installer's `build_daemon` (`bash -c 'source install.sh; build_daemon'`), so `dist/` matches the code the running daemon came from and a later restart starts a working daemon. The record says `failed` with `rolledBack: true|false`.

## Guards

- `blocked`: `not-built` (running from sources), `not-installer` (a development clone; never updated), `no-service` (not under launchd/systemd: nothing would start it again).
- `start` with a run in progress, a blocked daemon or no available update → `bad_request` with the reason.
- `busy` only warns: sessions keep running in tmux during the restart; the app disconnects for about a minute.
- The app asks for confirmation; development → main shows the downgrade warning.

## Compatibility

`auth.ok.update` is optional. An older daemon does not know `daemon.update.*`; the app only sends them when `update` is present and otherwise shows `remote-harness update` as the way to update.
