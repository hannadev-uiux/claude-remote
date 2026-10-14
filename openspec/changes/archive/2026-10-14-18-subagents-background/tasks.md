## 1. Daemon

- [x] 1.1 Estender o protocolo com `SubagentInfo`, `agentId` no subscribe e `backgroundTasks` em `Session`; verificar com testes de parse
- [x] 1.2 Implementar `SubagentTracker` (watcher + SubagentStop + timeout de inatividade) e captura de `background_tasks`; verificar com testes em diretório temporário
- [x] 1.3 Permitir assinatura de transcript de subagente; verificar com teste WS

## 2. App

- [x] 2.1 Mostrar subagentes aninhados e selo background na lista e seção na tela da sessão; verificar com typecheck
- [x] 2.2 Abrir transcript de subagente em somente leitura; verificar com `expo export`
