## Context

A profile is a Claude Code config dir with an id, a name and a color (and, since change 66, an agent). The launcher (`~/.remote-harness/bin/<profile>`, zsh) opens `claude` in a tmux window; the daemon starts sessions by running that launcher with `CLAUDE_REMOTE_NO_ATTACH=1`. The pairing token already lives in the OS secret store (`core/secrets.ts`: Keychain, `secret-tool` or a `0600` file). The app shows the session's model from the status line and has seams for the provider (`StatusBar.provider`, the Model row slot in New session, `profileDetail(profile, provider)`).

## Decisions

1. **Provider is a profile attribute, absent for the Anthropic account.** `Profile.provider?: { kind: 'openrouter', baseUrl?, model?, smallFastModel? }`. There is no `anthropic` kind: absence already means "the account logged into Claude Code", and an explicit default would only add a value to keep in sync. `kind` is an enum so another Anthropic-compatible gateway can be added without a new shape. `PROVIDER_NAMES` (product names, not translated) lives in the protocol next to the schema, like the agent ids.

2. **The key is a secret of the OS store, never of a file we write.** `remote-harness provider key <profile>` prompts (hidden) or reads stdin and stores the key in the same store as the pairing token, service `claude-remote`, account `provider-<profile>` (file store: `~/.remote-harness/secrets/provider-<profile>`, `0600`). It is never written to `config.json`, `settings.json`, rc files or the launcher, never logged, and no protocol message or push carries it. `KeychainTokenStore` and `SecretToolTokenStore` take the account as a parameter; `createSecretStore` generalizes `createTokenStore`.

3. **The key reaches Claude Code only inside the pane.** A `-e ANTHROPIC_AUTH_TOKEN=…` on `tmux new-window` or a value in the window's command line would show up in `ps` and in `#{pane_start_command}`. Instead, for a profile with a provider the launcher makes the window run the launcher itself with `CLAUDE_REMOTE_EXEC=1`; in that mode it reads the key (the `0600` file when it exists, else `security`, else `secret-tool`), exports `ANTHROPIC_AUTH_TOKEN` and `exec`s `claude`. Before creating the window, the launcher checks that a key is readable and otherwise fails with the `remote-harness provider key <profile>` hint on stderr, which the daemon forwards as the `session.start` error so the app shows it. The launcher keeps working from the user's terminal, which is why the daemon does not inject the environment itself.

4. **Non-secret variables are plain exports.** `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL` and `ANTHROPIC_SMALL_FAST_MODEL` are exported at the top of the launcher (they are visible in the generated file, which is fine) and `ANTHROPIC_API_KEY` is unset in the pane so a key exported in the user's shell is not sent to the gateway. `providerEnv(provider)` in `features/providers/openrouter.ts` is the single place that knows the variable names.

5. **Model per session is an argument; switching is a slash command.** `session.start.model` becomes `--model <id>`. In a running session the app sends `/model <id>` through `session.input` (mode `now`), the same path the composer uses for slash commands. The model shown in the context line keeps coming from the status line, so it follows switches made from either side.

6. **Catalog and credits come from the daemon, cached.** `models.list` answers from `GET <baseUrl>/v1/models` (no key needed): text-in/text-out models only, with the id, the name, the context length, prices in USD per million tokens and the `tools` / `reasoning` / `caching` flags (`caching` = a cache-read price is listed). The list is cached one hour in memory and in `models-cache.json`; when the fetch fails and a cached list exists, it is served with `stale: true`. `provider.status` answers `hasKey` and the credits from `GET /v1/credits` with the key (`null` when there is no key or the call fails). A profile without a provider gets `bad_request`.

7. **App.** `features/providers/logic.ts` holds the pure parts (provider name, search, price and context formatting, warnings, credits left); `ModelPickerSheet` is shared by New session (picks the start model) and the session menu (sends `/model`); `ProviderChip` is the dashed neutral chip (`via OpenRouter`) used on profile rows and in Settings, while the status bar keeps its own chip and receives the label.

## Alternatives rejected

- Daemon-injected environment at `session.start`: the launcher must behave the same from a terminal, and the daemon would still have to pass the secret through tmux.
- A wizard step: worthwhile, but independent of this change and bigger than the rest; left on #109.
- Filtering the catalog to "known good" models: nobody has that list yet; the picker warns instead of hiding (prototype `docs/design/identity/screens/model-picker.html`).

## Risks

- The OpenRouter responses may change shape: both parsers are lenient (unknown fields ignored, missing prices and lengths become `null`), and a parse failure falls back to the cached list.
- Reading the Keychain from inside the tmux pane triggers the same `security` access path the daemon already uses for the token; no new prompt is expected.
