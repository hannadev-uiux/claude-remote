# i18n Specification

## Purpose
Shows the CLI, the setup, push notifications and the app in pt-BR, en-US or es-ES, with the language chosen in the setup (computer side) and the device language (app).

## Requirements

### Requirement: Supported languages
The daemon, the CLI, `install.sh` and the app SHALL show every user-facing text in `pt-BR`, `en-US` or `es-ES`, from catalogs that MUST have the same keys. `en-US` SHALL be the fallback.

#### Scenario: Catalog parity
- **WHEN** a key exists in one catalog
- **THEN** it exists in the other two (typecheck and tests fail otherwise)

#### Scenario: Unknown system language
- **WHEN** the system or device language is `fr-FR`
- **THEN** texts are shown in `en-US`

### Requirement: Language choice in the setup
`claude-remote setup` SHALL ask the language as its first question, defaulting to the saved language or the system one, and MUST save the choice as `language` in `config.json`, keeping the other keys.

#### Scenario: Choosing Spanish
- **WHEN** the user picks `Español` in the first question
- **THEN** the rest of the setup is in Spanish and `config.json` has `"language": "es-ES"`

#### Scenario: Non-interactive
- **WHEN** the setup runs with `--yes`
- **THEN** it uses `--lang`, else the saved language, else the system one, without asking

### Requirement: Daemon language
CLI commands and push notifications SHALL use the `language` from `config.json`, or the system language when it is absent. Push texts MUST NOT include session content in any language.

#### Scenario: Push in English
- **WHEN** `language` is `en-US` and a session needs permission
- **THEN** the notification text is in English and contains only the profile and the event

### Requirement: App language
The app SHALL follow the iPhone language: `pt-*` → `pt-BR`, `es-*` → `es-ES`, otherwise `en-US`.

#### Scenario: iPhone in Spanish
- **WHEN** the iPhone language is `es-MX`
- **THEN** the app is shown in `es-ES`
