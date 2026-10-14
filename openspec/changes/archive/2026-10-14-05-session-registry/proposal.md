## Why

O app precisa de uma lista única com as sessões dos dois perfis, sabendo quais estão vivas no tmux e quais são só histórico (requisito D2).

## What Changes

- Registro de sessões no daemon que combina hooks (`SessionStart`, `SessionEnd`, `Stop`, `Notification`), painéis tmux existentes e transcripts recentes em disco.
- Estados `running`, `waiting` (aguardando entrada ou permissão), `idle` e `ended`; flag `controllable` (tem painel tmux vivo).
- Hook `UserPromptSubmit` adicionado aos hooks instalados.
- Persistência do vínculo sessão ↔ painel em `~/.claude-remote/state.json` para sobreviver a reinício do daemon.
- Mensagens `sessions.list` → `sessions.snapshot` e eventos `session.updated`/`session.removed`.

## Capabilities

### New Capabilities
- `session-registry`: descoberta, estado e listagem das sessões de todos os perfis.

### Modified Capabilities
- `hooks-integration`: passa a instalar também o hook `UserPromptSubmit`, usado para marcar a sessão como `running`.

## Impact

Módulos `infra/tmux`, `features/sessions` no daemon.
