## Why

O usuário quer trocar o modo de permissão (padrão, aceitar edições, plano, auto) pelo celular, e ver qual está realmente ativo (D13).

## What Changes

- Leitura do modo atual pelo `permission_mode` dos hooks, pelas linhas `permission-mode` do transcript e pela linha de status (`capture-pane`).
- `session.setMode { sessionId, mode }`: envia Shift+Tab e relê o modo até chegar ao alvo, desistindo após um ciclo completo.
- `bypassPermissions` nunca é aceito.
- Evento `session.state` com o modo confirmado.

## Capabilities

### New Capabilities
- `permission-mode`: leitura e troca do modo de permissão das sessões.

### Modified Capabilities

## Impact

Módulo `features/mode` no daemon.
