## Context

Entradas normalizadas (change 06); cursor por linha + index.

## Goals / Non-Goals

**Goals:** rolagem fluida com milhares de entradas.

**Non-Goals:** edição de mensagens, imagens.

## Decisions

- **Store de transcript por sessão** (Zustand): array ordenado + `Set` de chaves `uuid:index` para deduplicar; `lastCursor` usado na reassinatura.
- **Agrupamento**: `tool_result` é associado ao `tool_use` pelo `toolUseId` num seletor puro (`buildTimeline`), produzindo itens `message | tool | thinking | system`.
- **FlashList invertida** não é usada (problemas conhecidos); usa FlashList normal com `maintainVisibleContentPosition` e `onStartReached` para histórico.
- **Resumo de tool call** por função pura (`summarizeTool`) cobrindo Bash, Read, Edit, Write, Grep, Glob, Task/Agent, WebFetch, MCP.
- **Diff** com `diffLines` da lib `diff` para `old_string`/`new_string`.
- **Teclado**: `KeyboardAvoidingView` com `behavior="padding"`; `react-native-keyboard-controller` se necessário.

## Risks / Trade-offs

- [Markdown pesado em mensagens longas] → itens memoizados por chave.
