## 1. Conventions

- [x] 1.1 OpenSpec in English (`openspec/config.yaml`), i18n rules in `CLAUDE.md` and `CONTRIBUTING.md`

## 2. Shared

- [x] 2.1 `LocaleSchema`/`Locale` in `@claude-remote/protocol`; verify with protocol tests

## 3. Daemon and installer

- [ ] 3.1 `core/i18n` (catalogs, `resolveLocale`, `createI18n`) with parity and resolution tests
- [ ] 3.2 `language` in `ConfigSchema`; language as the first setup question, `--lang`, saved in `config.json`; verify with tests and a run in a temporary HOME
- [ ] 3.3 CLI commands, doctor, errors and push texts through the catalogs; verify with tests
- [ ] 3.4 `install.sh` messages in the three languages; verify with `bash -n` and `LANG=es_ES.UTF-8 ./install.sh --help`

## 4. App

- [ ] 4.1 `expo-localization`, `i18next`, `react-i18next`; typed catalogs, device language resolution; parity tests
- [ ] 4.2 Every screen, component and text-producing helper through the catalogs; verify with typecheck, tests and `npx expo export --platform ios`

## 5. OpenSpec in English

- [x] 5.1 Rewrite `openspec/specs/*` in English
- [x] 5.2 Rewrite every archived change in English
