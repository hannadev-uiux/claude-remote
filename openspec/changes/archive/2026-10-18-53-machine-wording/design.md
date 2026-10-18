## Context

`errorMessage(error, t)` (and a dozen other call sites) translate connection and push errors with `t(key)` only; they have no access to the connection state. The daemon already sends `host` (the computer's host name) in `auth.ok`, kept in the connection store as `hello.host`. The prototypes name the computer in every sentence that used to say "the daemon" and fall back to "your machine".

## Goals / Non-Goals

**Goals:** the host name in every "daemon" sentence without threading it through every call site; a generic fallback that reads well in the three languages, including at the start of a sentence; an alias slot ready for the Settings redesign; commands kept intact and placed ("On the computer, run …").

**Non-Goals:** the alias editing UI and the Machine section layout (#157); renaming code identifiers or protocol fields; the CLI's own vocabulary (it manages the background process and calls it the daemon); multi-machine pairing.

## Decisions

- **Resolution at translation time.** `createI18n` sets `interpolation.missingInterpolationHandler`: when a catalog text contains `{{machine}}` or `{{Machine}}` and the caller passed no such variable, the handler returns the registered machine name (or the catalog's `machine.generic` / `machine.genericSentence`). i18next calls the handler before its "skip on variables" default, and explicit variables still take precedence. The registry (`core/i18n/machine.ts`) is a module-level value with `setMachineName()` / `machineName()`, plus `resolveMachineName(alias, host)` (alias wins, then host, trimmed; `null` when neither), all pure and tested with real catalogs.
- **Sentence case.** `{{Machine}}` is used where the name opens a sentence; with a real host name both placeholders yield the same string, and the generic form is capitalized in the catalog ("Your machine", "Sua máquina", "Tu máquina").
- **Sync.** `useMachineNameSync()` (features/settings) derives the name from the alias store and `hello.host` and pushes it to the registry; it runs in the root layout so pairing-screen errors, banners and sheets all see the same name, and forgetting the machine clears it (no `hello`).
- **Alias store.** `useMachineStore` (Zustand + SecureStore `remote-harness.machine-alias`), restored at start with the other per-device switches; `setMachineAlias` is exported for #157.
- **Texts.** Commands stay verbatim and the sentence says where to run them; `claude-remote update` (the alias of the CLI) becomes `remote-harness update` everywhere in the app. Pairing errors happen before a handshake, so they naturally read with the generic name; `pairing.errors.timeout` asks whether "the computer is on Tailscale with Remote Harness running" instead of naming the daemon.
- **Settings.** The first card is titled "Machine" and gains a "name" row with the host; the host:port, version and protocol rows stay. The forget button says "Forget this machine".

## Risks / Trade-offs

- Relying on `missingInterpolationHandler` means a typo like `{{machin}}` would print the raw placeholder instead of failing: the catalog tests compare keys, not placeholders, so the machine test also scans every catalog and requires any placeholder that looks like the machine one to be spelled exactly `machine` or `Machine`.
- A host name is shown as the daemon reports it (no transformation); very long names truncate in the UI where other texts already do.
