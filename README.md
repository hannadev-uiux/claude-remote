# Claude Remote

Acompanhe e controle pelo iPhone as sessões do Claude Code que estão rodando no seu Mac — sem `/rc`, com os dois perfis (`~/.claude` e `~/.claude-doctorx`) numa lista só.

```
iPhone (Expo) ◄── WebSocket (Tailscale) ──► daemon no Mac ──► tmux ──► claude
                                               ▲
                                    hooks HTTP do Claude Code
```

- Conversa em tempo real (markdown, tool calls, diffs), envio de prompts, Esc/Ctrl+C
- Aprovar / negar / **permitir sempre** pedidos de permissão
- Trocar o modo de permissão (padrão, aceitar edições, plano, auto)
- Autocomplete de `@arquivos` e `/comandos` (skills do perfil, do projeto e de plugins)
- Terminal bruto (xterm.js) para menus da TUI, subagentes, iniciar/retomar sessões
- Push via FCM só para o seu aparelho, sem conteúdo da sessão

PRD completo em [`.docs/claude-remote-app.md`](.docs/claude-remote-app.md); specs em [`openspec/specs`](openspec/specs).

## Requisitos

- macOS com `tmux`, `git`, `rg` e o `claude` no PATH
- Node 24+ e pnpm 12+
- Tailscale no Mac e no iPhone (o WebSocket só escuta na interface Tailscale)
- Xcode para o development build do app (o Expo Go não serve: o app usa módulos nativos)
- Opcional, para push: conta Apple Developer paga + projeto Firebase

## Instalação no Mac

```bash
pnpm install
pnpm --filter @claude-remote/daemon build

# launchers claudin/drclaude, atalho claude-remote, PATH no ~/.zshrc e hooks nos dois perfis
node apps/daemon/dist/cli.js install
source ~/.zshrc

claude-remote doctor          # confere tmux, Tailscale, perfis, token…
claude-remote service install # LaunchAgent: sobe no login e reinicia se cair
claude-remote pair            # mostra o QR de pareamento
```

Perfis e portas ficam em `~/.claude-remote/config.json` (criado na primeira execução com `claudin → ~/.claude` e `drclaude → ~/.claude-doctorx`). O token fica no Keychain; `claude-remote rotate-token` gera outro e derruba as conexões.

### Uso

Abra as sessões com `claudin` ou `drclaude` (mesmos argumentos do `claude`). Elas rodam numa janela da sessão tmux `claude-remote` e aparecem no app como controláveis. Sessões abertas com o `claude` puro aparecem como somente leitura e podem ser retomadas pelo app.

Regras de "permitir sempre" criadas pelo celular: `claude-remote rules list` / `claude-remote rules undo <id>`.

## App (iOS)

```bash
cd apps/mobile
pnpm ios        # expo run:ios — development build no simulador ou no iPhone conectado
pnpm start      # Metro para o dev client
```

Sem Tailscale (simulador no mesmo Mac): `claude-remote start --dev` escuta em `127.0.0.1` e `claude-remote pair --dev` gera o QR correspondente (ou use o pareamento manual).

### Push (opcional)

1. Crie um app iOS no Firebase com o bundle `tech.doctorx.clauderemote` e envie a chave APNs ao projeto.
2. Coloque o `GoogleService-Info.plist` em `apps/mobile/` (ignorado pelo git) e rode `pnpm ios` de novo — o Firebase só entra no build quando o arquivo existe.
3. Salve a service account do Firebase em `~/.claude-remote/firebase-service-account.json` e reinicie o daemon.

## Desenvolvimento

```bash
pnpm check                                             # typecheck + testes + Biome em tudo
pnpm --filter @claude-remote/daemon dev start --dev    # daemon a partir do código-fonte
pnpm --filter @claude-remote/mobile icons              # regenera ícone/splash
pnpm --filter @claude-remote/mobile xterm              # regenera o HTML do terminal
```

Arquitetura e convenções: [`CLAUDE.md`](CLAUDE.md).

## Desinstalar

```bash
claude-remote service uninstall
claude-remote uninstall   # remove launchers, bloco do ~/.zshrc e só os hooks que o instalador criou
```
