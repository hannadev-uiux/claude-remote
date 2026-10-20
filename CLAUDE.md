# Remote Harness

App pessoal iOS/Android (React Native + Expo) que acompanha e controla, pelo celular, sessões do Claude Code rodando no tmux do computador (macOS, Linux ou WSL), por meio de um daemon local. PRD em `.docs/prd.md`.

## Estrutura

```
apps/daemon        Daemon Node/TS (WebSocket p/ app, HTTP p/ hooks, tmux, transcripts, push)
apps/mobile        App Expo (Expo Router, Zustand, TanStack Query)
apps/push-relay    Cloud Function (Firebase) que envia push por daemons sem conta de serviço, via grants
apps/push-edge     Worker do Cloudflare em push.remoteharness.app (endereço fixo do push-relay nas builds); deploy com `cf deploy`
apps/web           Site remoteharness.app: servidor Node em Docker atrás do Traefik do servidor (landing, docs, instaladores, servidor OTA, links de instalação), dados em volume; deploy com `make deploy-web`
packages/protocol  Schemas Zod + tipos do protocolo WebSocket (fonte única da verdade)
openspec/          Changes numerados (proposal, specs, design, tasks), sempre em en-US
```

### Daemon (`apps/daemon/src`)
- `core/` config, logger (pino), event bus tipado, keychain, paths
- `infra/` adaptadores de sistema (`TmuxClient`, fs atômico, executor de processos). Único lugar que chama `tmux`/`git`/`rg`/`security`.
- `features/<feature>/` regra de negócio por feature (sessions, transcript, input, attachments, permissions, mode, autocomplete, pane, lifecycle, subagents, push, mute, status-line, updates). Features não importam umas às outras diretamente quando um evento do bus resolve.
- `transport/` `ws-server` (app) e `hooks-server` (Fastify, 127.0.0.1). Handlers registrados por `router.register(type, handler)`.
- `main.ts` composição manual (DI por construtor). `cli.ts` comandos (commander).
- `tray/` helpers do ícone na bandeja (Swift no macOS, Python/AppIndicator no Linux): só desenham o menu que o daemon manda em JSON lines no stdin e devolvem os cliques no stdout.

### App (`apps/mobile`)
- `app/` rotas Expo Router finas (só compõem telas de `src/features`)
- `src/core/` `connection` (`DaemonClient` sem React), `storage`, `theme`, utilidades
- `src/ui/` componentes do design system (tema terminal escuro)
- `src/features/<feature>/` `components/`, `hooks/`, `store.ts`, lógica pura testável

## Comandos

```bash
make                                                  # lista os atalhos (install, check, ios-dev, install-ios, install-ios-link, publish-ota…)
pnpm install
pnpm check                                            # typecheck + testes + Biome (warnings falham)
pnpm lint:fix                                         # Biome com correções
pnpm --filter @remote-harness/daemon dev start --dev   # daemon do código-fonte em 127.0.0.1
pnpm --filter @remote-harness/daemon build             # dist/cli.js (usado pelo launchd e pelo atalho)
pnpm --filter @remote-harness/mobile ios               # development build iOS
pnpm --filter @remote-harness/mobile start             # Metro (dev client)
cd apps/mobile && npx expo export --platform ios      # valida o bundle sem simulador
```

## Convenções

- TypeScript estrito em tudo (`noUncheckedIndexedAccess`). Sem `any`; use `unknown` + Zod nas bordas.
- Toda mensagem WS é validada com `@remote-harness/protocol`. Ao adicionar mensagem: schema no pacote → handler no daemon → uso no app.
- Lógica pura (parsers, seletores, detectores) em funções separadas e com testes Vitest. Efeitos colaterais ficam em `infra/` (daemon) e `core/` (app) e são injetados.
- O formato do `.jsonl` do Claude Code é interno: só `features/transcript/parser.ts` o conhece.
- Rótulos da TUI (modo de permissão etc.) ficam em uma tabela única com testes.
- Escrita em arquivos do usuário (`settings.json`, `.zshrc`) é sempre: ler → mesclar → backup → escrita atômica, e idempotente.
- Formatação/lint: Biome. Código e identificadores em inglês.
- Textos de UI sempre por i18n, em pt-BR, en-US e es-ES (catálogos tipados, mesmas chaves nos três; testes de paridade). Nunca texto fixo na UI, no CLI ou no push.
- OpenSpec sempre em inglês (en-US), inclusive os changes arquivados (`openspec/config.yaml`).
- App: dependências nativas sempre com `npx expo install` (ver `apps/mobile/AGENTS.md`); só código sem `react-native` é testado com Vitest (`*.test.ts`).
- pnpm com instalação isolada (padrão): cada pacote declara as próprias dependências. Scripts de build de dependências são liberados/negados em `allowBuilds` no `pnpm-workspace.yaml`.
- Arquivos gerados: `*.generated.ts` (xterm) e `assets/*.png` (ícone) — regenere com os scripts, não edite à mão.
- Segurança: WS só na interface Tailscale (ou 127.0.0.1 com `--dev`), token obrigatório (Keychain no Mac, SecureStore no app); hooks só em 127.0.0.1 com segredo. Push nunca carrega conteúdo da sessão (exceção: o status ao vivo leva o título e a pasta da sessão). `bypassPermissions` nunca é oferecido pelo app.

## Tema visual

Tokens semânticos por tema em `apps/mobile/src/core/theme` (`palettes.ts`), lidos em tempo de render com `useTheme()` / `makeStyles(theme => …)`; nunca importe uma paleta estática nem escreva hex fora desse módulo (há teste que falha). Cinco temas (`dark`, `light`, `dracula`, `mocha`, `latte`), escolhidos em Settings → Appearance (`system` segue o celular); teste de paridade e de contraste WCAG para todos. Tema padrão **dark**, terminal escuro estilo Claude Code: fundo `#0D0D0D`, superfície `#161616`, borda `#2A2A2A`, texto `#E8E6E3`, secundário `#8A8784`, destaque âmbar `#E8A33D` (`accent` para preenchimentos/bordas, `accentText` para texto e ícones, `accentInk` sobre o preenchimento), aviso `#F3DC7A`; fonte JetBrains Mono. Cores de agente fixas em todos os temas (`agents.ts`): Claude Code `#D97757`, Codex `#2FBF8F`, Kimi `#5B9BF5`, Qwen `#8C6CF5`; provedores (OpenRouter) só com contorno neutro. Protótipos em `docs/design/identity/`.

## Fluxo de trabalho (OpenSpec)

- Implementar os changes em ordem numérica (`openspec/changes/NN-*`), uma task por vez, marcando `- [x]` no `tasks.md` ao concluir e verificar.
- Ao concluir um change: `pnpm check` verde, depois `openspec archive NN-nome -y`.
- Mudou um requisito? Atualize o spec do change antes do código.
