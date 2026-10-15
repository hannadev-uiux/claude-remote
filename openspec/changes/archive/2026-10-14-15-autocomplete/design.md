## Context

Installed plugins live in `<configDir>/plugins/` (manifest `installed_plugins.json` with `installPath`).

## Goals / Non-Goals

**Goals:** response < 100 ms in medium-sized repositories.

**Non-Goals:** MCP server commands (free text is still accepted).

## Decisions

- **File index per `cwd`**: `git ls-files -co --exclude-standard` if it is a git repository; otherwise `rg --files`. Folders derived from the paths. Cache with a 30 s TTL + invalidation by a shallow watcher (chokidar `depth: 0`... avoided; the TTL is enough).
- **fuzzysort** (fast, maintained) with `keys` on the path and a boost for the file name.
- **Frontmatter** parsed with `yaml` after splitting off the `---` block; without `name`, the folder/file name is used; nested commands become `folder:name`.
- **Built-in list** in `builtin-commands.ts` with an `interactive` flag.
- **App**: `useQuery` with key `[sessionId, query]`, `staleTime` 10 s; current token detected from the `TextInput` cursor (`selection`).

## Risks / Trade-offs

- [Huge repository] → limit of 200 thousand paths in the index.
