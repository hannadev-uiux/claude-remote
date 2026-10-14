## Context

Transcripts ficam em `<configDir>/projects/<cwd-sanitizado>/<sessionId>.jsonl`; entradas `custom-title`/`agent-name` dão o título, e `permission-mode` o modo.

## Goals / Non-Goals

**Goals:** lista barata de montar (sem ler transcripts inteiros).

**Non-Goals:** subagentes e background (change 18).

## Decisions

- **`TmuxClient`** em `infra/tmux` encapsula `execa('tmux', ...)`: `listPanes`, `capturePane`, `sendKeys`, `pasteText`, `newWindow`. Único lugar que conhece a CLI do tmux; testável com executor falso.
- **Varredura de recentes**: `fs.readdir` em `projects/*` filtrando por `mtime`; o título é obtido lendo só os últimos 64 KB do arquivo (busca da última entrada `custom-title`, `last-prompt` ou primeira mensagem do usuário) e o `cwd` pelas entradas com campo `cwd`.
- **Repositório em memória** (`SessionStore`) com `Map<id, Session>`, emitindo `session.updated` no bus em cada `upsert`. Persistência com debounce de 500 ms.
- **Polling de painéis** a 5 s com `tmux list-panes -a -F '#{pane_id}'` (chamada barata).

## Risks / Trade-offs

- [Muitos transcripts antigos] → limite de 7 dias e no máximo 50 recentes por perfil.
