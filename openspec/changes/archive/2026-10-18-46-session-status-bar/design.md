## Context

Claude Code runs the `statusLine` command of the active settings on every conversation update (throttled) and passes a JSON document on stdin. Since 2.1 it includes `model.{id,display_name}`, `effort.level` (only for models with reasoning effort), `context_window.{total_input_tokens,context_window_size,used_percentage}` and, for subscribers, `rate_limits.{five_hour,seven_day}.{used_percentage,resets_at}` (epoch seconds). That is everything the issue asks for, from Claude Code itself, so the transcript is not needed as a source.

## Goals / Non-Goals

**Goals:** show model, effort, context usage and the 5-hour/weekly limits per session; keep the user's own status line working unchanged; reversible install.

**Non-Goals:** transcript-derived fallback (the statusLine JSON is authoritative and arrives on the first update); parsing the TUI footer; a per-session summary in the session list (later); gateway `spend_limit`.

## Decisions

- **Wrapper, not replacement.** Only one `statusLine` exists per settings file, so we wrap it: `statusLine.command` becomes `'<bin>/remote-harness-statusline' '<base64 of the original command>'` (argument omitted when there was none). Other keys of the object (`padding`, …) are kept. The script:
  1. reads stdin once;
  2. posts it with `curl -m 2` to `http://127.0.0.1:<port>/statusline` with the secret, pane and profile headers, in the background with all output discarded, so a stopped daemon never slows or breaks the status line;
  3. decodes the original command with `base64 -d` and `exec`s it through `/bin/sh -c` with the same input; with no original it prints nothing (Claude Code shows no status line for empty output, as before).
  Keeping the original inside our command makes the settings file self-contained: no side file to lose, and uninstall restores exactly what was there. Reinstalling decodes and re-wraps (idempotent); if the user later replaced our command with their own, the next install wraps theirs.
- **Script holds port and secret**, like the hooks entries already in `settings.json`; it is rendered by the installer into the launcher dir with mode 0700 and rewritten on every install.
- **Pure pieces with tests:** `parseStatusLine(json)` → `{ sessionId, status, limits }` (Zod, loose, every field optional; invalid percentages dropped), `wrapStatusLine` / `unwrapStatusLine` / `isOurStatusLine` over a settings object, `renderStatusLineScript`.
- **Wire shape.** `Session.status: { model, effort, context: { usedTokens, size, percent } | null } | null` (defaults to `null`, so older daemons and apps are fine). Account limits belong to the profile (each profile is its own Claude account): `limits.updated { limits: { profileId, fiveHour, sevenDay, updatedAt } }`, each window `{ percent, resetsAt }` (epoch ms) or `null`. The daemon keeps the latest per profile in memory and sends them on connect.
- **No reordering.** Status changes patch the session with its current `updatedAt`, so the session list order does not churn on every tick; `SessionStore.upsert` already drops no-op patches.
- **Unknown session.** A status line can arrive before the session is registered (before `SessionStart` is processed); the latest status per unknown id is kept (bounded) and applied when the session appears.
- **App.** `session-status/logic.ts` (pure): `statusItems(status, limits, now)` returns the visible items with `level` (`normal` < 70 ≤ `warning` < 90 ≤ `critical`), `formatTokens` (`124k`, `1.2M`), `formatReset(resetsAt, now, locale)` (time today, weekday + time otherwise) and expiry of windows whose `resetsAt` passed. `StatusBar` renders a single horizontally clipped line under the session info row; `StatusSheet` lists the details. Limits live in a small Zustand store bound like mute.

## Risks / Trade-offs

- A project-level `.claude/settings.json` with its own `statusLine` overrides the profile's one, so those sessions report nothing; the bar simply stays hidden there.
- `rate_limits` exists only for Claude.ai subscribers; API-key users see model, effort and context only.
- The JSON is undocumented-but-stable Claude Code output; parsing is tolerant and missing fields hide items.
