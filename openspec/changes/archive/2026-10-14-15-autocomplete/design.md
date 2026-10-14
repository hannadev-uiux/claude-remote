## Context

Plugins instalados ficam em `<configDir>/plugins/` (manifesto `installed_plugins.json` com `installPath`).

## Goals / Non-Goals

**Goals:** resposta < 100 ms em repositórios médios.

**Non-Goals:** comandos de servidores MCP (texto livre continua aceito).

## Decisions

- **Índice de arquivos por `cwd`**: `git ls-files -co --exclude-standard` se for repositório git; senão `rg --files`. Pastas derivadas dos caminhos. Cache com TTL de 30 s + invalidação por watcher raso (chokidar `depth: 0`... evitado; TTL basta).
- **fuzzysort** (rápido, mantido) com `keys` no caminho e boost para o nome do arquivo.
- **Frontmatter** com `yaml` após separar o bloco `---`; sem `name`, usa o nome da pasta/arquivo; comandos aninhados viram `pasta:nome`.
- **Lista nativa** em `builtin-commands.ts` com flag `interactive`.
- **App**: `useQuery` com chave `[sessionId, query]`, `staleTime` 10 s; detecção do token atual pelo cursor do `TextInput` (`selection`).

## Risks / Trade-offs

- [Repositório gigante] → limite de 200 mil caminhos no índice.
