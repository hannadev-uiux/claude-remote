## Context

User-facing text lives inline in the daemon (`cli.ts`, `features/setup/*`, `features/push/*`, `doctor`) and in the app (screens, components, pure helpers such as `setup-guide.ts`). There is no i18n layer.

## Goals / Non-Goals

**Goals:** three locales (`pt-BR`, `en-US`, `es-ES`) with the same keys, checked at compile time and by tests; language chosen in the setup for the Mac side; the app follows the device language.

**Non-Goals:** translating Claude Code output or TUI labels (they come from Claude Code); right-to-left languages; an in-app language picker (iOS per-app language settings cover it); translating the README.

## Decisions

- **Locale type**: `type Locale = 'pt-BR' | 'en-US' | 'es-ES'`, defined once in `@claude-remote/protocol` (`LocaleSchema`) so the daemon config and the app share it. `en-US` is the fallback.
- **Locale resolution** (pure, tested): `resolveLocale(tag)` maps `pt*` → `pt-BR`, `es*` → `es-ES`, anything else → `en-US`; accepts POSIX (`pt_BR.UTF-8`) and BCP 47 (`es-419`) tags.
- **Daemon catalogs**: no dependency. `src/core/i18n/` with `en-US.ts` as the source of the `Messages` type (nested object of strings and functions for interpolation/plurals) and `pt-BR.ts`/`es-ES.ts` declared `satisfies Messages`, so a missing key fails `tsc`. `createI18n(locale)` returns the catalog; the active one is injected (setup, CLI, push) instead of being a global.
- **Config**: `ConfigSchema` gains optional `language: Locale`. Written with the same read → merge → backup → atomic write rule.
- **Setup**: language is step 0, before the banner text that depends on it is printed (the logo is language-neutral). `--lang` skips the question.
- **install.sh**: three `case` branches on the detected locale setting the message variables; no external files, since it runs before the source is downloaded.
- **Push**: notification title/body are built by the daemon in its configured language; they still never contain session content.
- **App**: `i18next` + `react-i18next` (most used RN i18n stack, typed resources via module augmentation) and `expo-localization` (`getLocales()[0].languageTag`). Resources in `src/core/i18n/locales/{en-US,pt-BR,es-ES}.ts`, `en-US` typed as the reference, the others `satisfies`. Pure helpers that produce text receive keys or a `t` function so they stay testable with Vitest. `expo-localization` config plugin lists the supported locales so iOS shows the app in the right language.

## Risks / Trade-offs

- Translation drift → parity tests compare the key sets of all catalogs (daemon and app).
- Native dependency in the app → requires a new development build; documented in the PR.
