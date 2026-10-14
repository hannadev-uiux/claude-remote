## Context

O `PermissionRequest` aceita `decision.updatedPermissions` com `addRules` e `destination` (`userSettings`, `localSettings` etc.), e traz `permission_suggestions`.

## Goals / Non-Goals

**Goals:** nenhuma decisão tomada sem o usuário; regras exatamente as mostradas.

**Non-Goals:** editar `updatedInput`.

## Decisions

- **Gravação via `updatedPermissions`**: `scope: profile` → `destination: "userSettings"` (o Claude Code grava no `settings.json` do `CLAUDE_CONFIG_DIR` da sessão); `scope: project` → `"localSettings"`. Assim o próprio CLI aplica a regra na sessão atual e persiste preservando o arquivo. O daemon registra no `rules-log.jsonl` (id, regra, escopo, arquivo, data). `rules undo` remove a regra editando o arquivo (leitura, filtro, escrita atômica).
- **Regra sugerida**: usa a primeira sugestão `addRules` do payload; sem sugestão, gera `Tool(prefixo:*)` para Bash (primeira palavra + subcomando) ou `Tool` para as demais.
- **Escopo padrão**: `project` (mais restrito), configurável em `config.json` (questão em aberto do PRD resolvida pelo lado seguro).
- **Pending map** `requestId → { resolve, timer }`; tempo limite padrão 280 s com hook a 300 s. Cancelamento detectado por `request.raw.on('close')`.

## Risks / Trade-offs

- [Regra ampla demais] → o app mostra a regra exata e o escopo antes de confirmar (change 14).
