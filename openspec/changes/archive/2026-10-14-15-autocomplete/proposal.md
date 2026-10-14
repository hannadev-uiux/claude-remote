## Why

Digitar caminhos e nomes de skills no celular é lento e sujeito a erro; o autocomplete da TUI não funciona porque o texto é colado (D15, D16, A13, A14, A15).

## What Changes

- Daemon: `files.search` com índice por `cwd` (via `git ls-files`/`rg --files`, respeitando `.gitignore`), pastas incluídas e filtro fuzzy, top 20.
- Daemon: `commands.list` com skills e comandos do perfil, do projeto, de plugins instalados e nativos, em cache com watcher.
- App: sugestões ao digitar `@` e `/` no campo de prompt, com busca incremental e debounce.
- App: comandos que abrem menu na TUI (`/model`, `/config` etc.) levam ao terminal bruto.

## Capabilities

### New Capabilities
- `autocomplete`: sugestões de arquivos e comandos para o campo de prompt.

### Modified Capabilities

## Impact

Módulo `features/autocomplete` no daemon (dependências `fuzzysort`, `yaml`); `src/features/autocomplete` no app.
