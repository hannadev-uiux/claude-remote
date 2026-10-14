## Context

Snapshot e eventos vêm do daemon (change 05).

## Goals / Non-Goals

**Goals:** rolagem fluida com dezenas de sessões.

**Non-Goals:** busca textual.

## Decisions

- **`useSessionsStore`** (Zustand) com `Map` por id, alimentado por `sessions.snapshot` e eventos; seletor `selectGroupedSessions` puro e testado (agrupamento e ordenação).
- **FlashList** com itens de cabeçalho e de sessão (`getItemType`).
- **Tempo relativo** com `Intl.RelativeTimeFormat` (pt-BR), sem dependência extra.
- Toque leva a `/session/[id]`.

## Risks / Trade-offs

- [Muitos eventos seguidos] → atualizações agrupadas pelo próprio Zustand; itens memoizados.
