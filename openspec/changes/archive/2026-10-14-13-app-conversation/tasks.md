## 1. Dados

- [x] 1.1 Implementar store de transcript com deduplicação, paginação e cursor, ligado a `session.subscribe`/`session.history` e à reassinatura na reconexão; verificar com testes do store
- [x] 1.2 Implementar `buildTimeline` e `summarizeTool`; verificar com testes unitários

## 2. UI

- [x] 2.1 Criar componentes `UserMessage`, `AssistantMessage` (markdown), `ThinkingBlock`, `ToolCallCard`, `DiffView`, `UnknownEntry`; verificar com typecheck
- [x] 2.2 Criar tela `/session/[id]` com cabeçalho, FlashList, histórico e botão "novas mensagens"; verificar com `expo export`
- [x] 2.3 Criar `PromptComposer` e `KeyBar` (Esc, Ctrl+C com confirmação, setas, Enter, Tab, 1-3); verificar com typecheck e teste do envio
