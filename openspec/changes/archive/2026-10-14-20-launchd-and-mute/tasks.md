## 1. Serviço

- [x] 1.1 Configurar build `tsup` do daemon e binário `claude-remote`; verificar com `pnpm --filter daemon build` e `node dist/cli.js --help`
- [x] 1.2 Implementar `service install|uninstall|status` com geração do plist; verificar com teste do plist gerado e `plutil -lint`
- [x] 1.3 Tratar "no server running" do tmux como lista vazia; verificar com teste do `TmuxClient`

## 2. Silenciar

- [x] 2.1 Implementar `MuteStore` no daemon e checagem no `PushService`; verificar com testes
- [x] 2.2 Criar interruptores por perfil nas configurações e botão de sino na sessão; verificar com typecheck e `expo export`
