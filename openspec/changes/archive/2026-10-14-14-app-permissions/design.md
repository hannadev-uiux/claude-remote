## Context

Mensagens do change 08 e 09.

## Goals / Non-Goals

**Goals:** responder com um toque e sem ambiguidade.

**Non-Goals:** ações na notificação (change 19).

## Decisions

- **Store de permissões** global (`Map<requestId, PermissionRequest>`) para que lista e sessão leiam o mesmo estado.
- **`BottomSheet`** simples com `Modal` nativo (`presentationStyle="pageSheet"`) para a confirmação; evita dependência extra.
- **`describePermission`** puro: extrai título/detalhe por ferramenta (reaproveita `summarizeTool`).
- **Haptics**: `notificationAsync(Warning)` ao chegar pedido com a sessão aberta.

## Risks / Trade-offs

- [Pedido expira enquanto o usuário decide] → contagem regressiva visível; resposta tardia recebe `already_resolved` e é exibida.
