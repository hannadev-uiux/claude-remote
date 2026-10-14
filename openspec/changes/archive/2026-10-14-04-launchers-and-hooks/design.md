## Context

O Claude Code suporta hooks `type: "http"` com `url`, `headers`, `timeout` e `allowedEnvVars` (interpolação `$VAR` nos headers). Isso dispensa scripts intermediários.

## Goals / Non-Goals

**Goals:** vincular sessão ↔ painel tmux ↔ perfil sem nenhuma chamada extra do launcher.

**Non-Goals:** suportar shells além do zsh na v1.

## Decisions

- **Hooks HTTP diretos**: headers `X-Claude-Remote-Secret` (literal), `X-Claude-Remote-Pane: $TMUX_PANE` e `X-Claude-Remote-Profile: $CLAUDE_REMOTE_PROFILE`, com `allowedEnvVars: ["TMUX_PANE","CLAUDE_REMOTE_PROFILE"]`. Fora do tmux os headers chegam vazios e a sessão vira somente leitura.
- **Marcação dos hooks**: URL contém `/hooks/` do daemon em `127.0.0.1:<porta>`; o instalador identifica os seus pela URL, sem campos extras que o Claude Code poderia rejeitar.
- **Timeouts**: 5 s para eventos informativos; `PermissionRequest` com timeout configurável (padrão 300 s).
- **Launchers como scripts zsh** gerados em `~/.claude-remote/bin/` a partir de um template com o perfil embutido; usam `tmux new-window -P -F '#{pane_id}'` e `attach`/`switch-client`.
- **Perfil também detectado pelo `transcript_path`** (prefixo do `configDir`) como redundância.
- **Escrita de JSON segura**: leitura, merge, escrita em arquivo temporário e `rename` atômico.

## Risks / Trade-offs

- [Formato dos hooks muda] → instalador centraliza a montagem do bloco em uma função testada.
- [Usuário edita o `settings.json` à mão depois] → merge por URL é tolerante.
