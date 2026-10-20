## 1. Secrets and key check

- [x] 1.1 Add `SecretStore` (`TokenStore` + `delete()`) in `core/secrets.ts`; implement `delete` in the Keychain, Secret Service and file stores; `createSecretStore` / `providerKeyStore` return it. Test the file store's `delete`, including a missing file.
- [x] 1.2 Create `features/providers/key-check.ts` with `checkProviderKey(fetch, provider, key)` (credits → key → unknown) and tests for valid with credits, regular key (403 → `/v1/key` 200), 401 invalid and network failure.

## 2. Wizard

- [x] 2.1 Add `suggestProviderProfile` / `suggestProviderConfigDir` in `features/setup/profiles.ts` (unique alias and folder) with tests.
- [x] 2.2 Add `setup.provider` texts (pt-BR, en-US, es-ES) and the menu entry.
- [x] 2.3 In `wizard.ts`: keep provider profiles out of the folder checkbox; list them with keep / replace key / remove; add the "Add an OpenRouter profile" flow (name, alias, folder, model, key with check); hold keys in memory.
- [x] 2.4 After `writeConfig`, store new/replaced keys and delete removed profiles' keys, one line each with the store label; mark provider profiles `via OpenRouter` in the summary box.
- [x] 2.5 Inject the provider key store, its label and `fetch` from `cli.ts`.

## 3. Docs and validation

- [x] 3.1 Update `daemon.md` and `getting-started.md` in the three languages.
- [x] 3.2 Run `pnpm check` and confirm it is green.
