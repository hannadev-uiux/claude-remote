## Why

O usuário precisa ver de relance o que está rodando nos dois perfis e entrar na sessão certa (A2).

## What Changes

- Tela inicial com sessões agrupadas por perfil (cabeçalho com a cor do perfil), estado (rodando, aguardando, ociosa, encerrada), título, diretório e tempo relativo.
- Sessões aguardando permissão destacadas no topo de cada grupo.
- Filtro de perfil e "puxar para atualizar".
- Atualização em tempo real via `session.updated`.

## Capabilities

### New Capabilities
- `app-session-list`: listagem das sessões no app.

### Modified Capabilities

## Impact

`src/features/sessions` no app.
