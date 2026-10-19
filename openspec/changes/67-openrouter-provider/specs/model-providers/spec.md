## ADDED Requirements

### Requirement: Provider key storage
`remote-harness provider key <profile>` SHALL store the provider key of a profile in the same OS secret store as the pairing token (macOS Keychain, Secret Service or a `0600` file), under the account `provider-<profile>`, reading it from a hidden prompt or from standard input with `--stdin`. It MUST reject an unknown profile, a profile without a provider and an empty key. The key MUST NOT be written to `config.json`, `settings.json`, shell rc files or the launcher, MUST NOT be logged, and MUST NOT be sent in any protocol message or push.

#### Scenario: Store the key
- **WHEN** the user runs `remote-harness provider key work` on a profile with provider `openrouter` and types the key
- **THEN** the key is stored under `provider-work` and the command says where, without printing the key

#### Scenario: Profile without a provider
- **WHEN** the user runs `remote-harness provider key personal` and that profile has no `provider`
- **THEN** the command fails explaining that the profile needs a `provider` in `config.json`

### Requirement: Model catalog
`models.list` with a profile id SHALL answer `models.results` with the models of that profile's provider from `GET <baseUrl>/v1/models`: text-in/text-out models only, each with the id, the name, the context length, the prompt and completion prices in USD per million tokens (`null` when not listed) and whether it supports tools, reasoning and prompt caching. The list MUST be cached for one hour in memory and on disk (`models-cache.json`); when the fetch fails and a cached list exists, it MUST be served with `stale: true`. A profile without a provider MUST get `error` `bad_request`; an unknown profile `not_found`.

#### Scenario: Fresh list
- **WHEN** the app requests the models of an OpenRouter profile for the first time
- **THEN** the daemon fetches the catalog, answers with the parsed models and `stale: false`, and a second request within the hour is answered from the cache without another fetch

#### Scenario: Gateway unreachable
- **WHEN** the fetch fails and the daemon has a list from an earlier run on disk
- **THEN** it answers that list with `stale: true`

#### Scenario: Capability flags
- **WHEN** a model lists `tools` among its supported parameters and a cache-read price
- **THEN** its entry has `tools: true` and `caching: true`

### Requirement: Provider status
`provider.status` with a profile id SHALL answer `provider.info` with `hasKey` (whether a key is stored for the profile) and the credits of the provider account from `GET <baseUrl>/v1/credits` (`total` and `used`), or `null` when there is no key or the call fails. The reply MUST NOT contain the key.

#### Scenario: Credits
- **WHEN** the profile has a stored key and the provider reports 50 credits bought and 7.9 used
- **THEN** the reply has `hasKey: true` and `credits: { total: 50, used: 7.9 }`

#### Scenario: No key
- **WHEN** no key is stored for the profile
- **THEN** the reply has `hasKey: false` and `credits: null` without calling the provider

### Requirement: Model picker
The app SHALL offer a model picker for profiles with a provider: a search field filtering by id and name, one row per model with its id, `<context> context · $<in> / $<out>` and the capabilities it has (`tools ✓`, `thinking ✓`, `cache ✓`), a warning in the warning color for models without tool use or without prompt caching (never hidden), and a footer with the credits left and when the list was fetched (or the hint to store the key when `hasKey` is false). The picker SHALL be used by New session to choose the start model and by the session menu to switch the model of a running session. All texts MUST be translated.

#### Scenario: Search
- **WHEN** the user types `opus`
- **THEN** only models whose id or name contains `opus` remain

#### Scenario: Unsupported model
- **WHEN** a model has no `tools` flag
- **THEN** its row shows the warning that Claude Code needs tool use, and it can still be picked

### Requirement: Doctor reports provider keys
`remote-harness doctor` SHALL list, for every profile with a provider, whether a key is stored, with the `remote-harness provider key <profile>` hint when it is not.

#### Scenario: Missing key
- **WHEN** the profile `work` has provider `openrouter` and no stored key
- **THEN** `doctor` prints a failed check for the OpenRouter key of `work` with the command to run
