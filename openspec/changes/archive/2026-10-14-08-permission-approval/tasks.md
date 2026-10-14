## 1. Núcleo

- [x] 1.1 Implementar `PermissionBroker` (pending map, timeout, resposta única, cancelamento); verificar com testes de allow, deny, timeout, duplicata e cancelamento
- [x] 1.2 Implementar geração da regra sugerida; verificar com testes para Bash, Edit e MCP
- [x] 1.3 Implementar montagem da saída do hook com `updatedPermissions`; verificar com teste do JSON exato

## 2. Integração

- [x] 2.1 Ligar a rota `PermissionRequest` ao broker e os handlers `permission.respond`; verificar com teste de integração hook HTTP + WS
- [x] 2.2 Implementar `rules-log.jsonl` e `claude-remote rules list|undo`; verificar com teste em diretório temporário
