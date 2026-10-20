<div align="center">

<img src="docs/brand/og.png" width="720" alt="Remote Harness: acompanhe e conduza seus agentes de código pelo celular" />

# Remote Harness

**Acompanhe e conduza pelo celular (iPhone ou Android) os seus agentes de código — Claude Code e Codex CLI — que rodam no seu Mac, Linux ou Windows (WSL).**

Auto-hospedado: um daemon pequeno no computador, um app nativo no celular e um link privado do Tailscale entre os dois.<br/>Sem relay na nuvem, sem notificação para a conta inteira, todos os perfis numa lista só.

[Documentação](https://remoteharness.app/pt-br/docs/) · [English](README.md) · [Contribuindo](CONTRIBUTING.md) · [Segurança](SECURITY.md)

</div>

<p align="center">
  <img src="docs/screenshots/sessions.png" width="24%" alt="Lista de sessões com uma sessão esperando você" />
  <img src="docs/screenshots/conversation.png" width="24%" alt="Conversa com a linha de modelo e contexto" />
  <img src="docs/screenshots/permission.png" width="24%" alt="Pedido de permissão" />
  <img src="docs/screenshots/terminal.png" width="24%" alt="Terminal bruto" />
</p>
<p align="center">
  <img src="docs/screenshots/new-session.png" width="24%" alt="Nova sessão" />
  <img src="docs/screenshots/settings.png" width="24%" alt="Ajustes" />
  <img src="docs/screenshots/ipad.png" width="44%" alt="iPad com a lista de sessões ao lado" />
</p>

---

## Por quê

O Claude Code rende mais em tarefas longas e autônomas — justamente quando você sai da mesa. Aí ele para pedindo permissão para rodar `pnpm test` e a tarefa inteira espera você voltar.

O controle remoto nativo (`/rc`) ajuda, mas não atendia um uso real:

- **Notifica todos os dispositivos da conta**, inclusive os que não deveriam receber nada.
- **Trabalha com uma conta por vez.** Muita gente usa dois logins do Claude Code no mesmo Mac (pessoal e trabalho, via `CLAUDE_CONFIG_DIR`) e quer ver os dois juntos.
- **Não existe API pública para se anexar a uma sessão interativa** a partir de outro processo.

O Remote Harness resolve isso com ferramentas em que você já confia: as sessões rodam no **tmux**, o Claude Code avisa o que acontece pelos **hooks HTTP** nativos e um **daemon** local liga tudo ao celular pelo **Tailscale**.

## Status

**Alpha.** As versões ficam no [GitHub Releases](https://github.com/maarkN/remote-harness/releases), todas com o sufixo `-ALPHA` enquanto o projeto está em testes. Ele é usado todo dia pelos autores, mas espere arestas e mudanças incompatíveis entre versões.

- **Computador:** macOS, Linux e Windows (WSL2), instalado com um comando e atualizado com `remote-harness update` (ou sozinho, pela barra de menus).
- **Celular:** iOS/iPadOS e Android 10+. Ainda fora das lojas: instale o APK do Android pelas releases ou compile o app ([primeiros passos](https://remoteharness.app/pt-br/docs/getting-started/#instalar-o-app)); TestFlight e Google Play estão em andamento ([#161](https://github.com/maarkN/remote-harness/issues/161)). Os builds instalados recebem atualizações de JavaScript pelo ar.
- **Agentes:** Claude Code (quantas contas quiser, também via OpenRouter) e Codex CLI. Kimi e Qwen Code estão nos planos.
- **Idiomas:** o app, o CLI, as notificações e o [site](https://remoteharness.app/pt-br/) em inglês, português do Brasil e espanhol.

## O que ele faz

- **Uma lista, todos os perfis** — sessões de todos os perfis, ordenadas pelo que mexeu por último, com estado ao vivo e uma faixa "esperando você" no topo.
- **Claude Code e Codex** — perfis do Claude Code (nas suas contas da Anthropic ou com modelos do OpenRouter) e do Codex CLI lado a lado, cada um com o seu launcher.
- **Conversa em tempo real** — markdown, raciocínio, tool calls, diffs e resultados, paginados.
- **Enviar prompts** — para o mesmo processo aberto no computador, com `Esc` e `Ctrl+C`; enfileire mensagens enquanto o agente trabalha (ou envie na hora), mantenha um rascunho por sessão, dite no próprio aparelho e anexe fotos.
- **Aprovar permissões** — permitir, negar ou **permitir sempre** (a regra é gravada pelo próprio Claude Code e pode ser desfeita com `remote-harness rules undo`); responda às perguntas do agente e aprove planos.
- **Trocar o modo de permissão** — padrão, aceitar edições, plano, auto. O `bypassPermissions` nunca é oferecido.
- **Autocomplete** — `@arquivos` e todos os `/comandos` (nativos, projeto, perfil e plugins), com os recentes primeiro.
- **Terminal bruto** — xterm.js com o painel do tmux para menus da TUI.
- **Subagentes** — acompanhe subagentes e tarefas em segundo plano.
- **Iniciar, retomar, encerrar** — nova sessão em qualquer pasta (com seletor e recentes), retomar uma somente leitura e encerrar com limpeza da worktree que nunca descarta trabalho sem avisar.
- **Push privado** — só no *seu* aparelho, sem conteúdo da sessão; silencie por perfil ou sessão.
- **Status ao vivo** — enquanto uma sessão trabalha, o estado, o tipo de etapa, as tarefas em paralelo e o tempo aparecem na tela bloqueada e na Dynamic Island (Live Activity no iOS) ou numa notificação silenciosa (Android).
- **Celular e iPad** — cinco temas (escuro, claro, Dracula, Mocha, Latte), layout de iPad com lista lateral e inspetor, e atalhos de teclado físico.
- **Barra de menus e atualizações** — um ícone na barra de menus do computador com o estado do daemon e as atualizações; o celular também atualiza o computador.
- **Relatórios de erro** — opcionais, sem nada das suas sessões, e uma tela "Relatar um problema".

## Como funciona

1. Você abre o Claude Code com um launcher (um por conta, com o nome que você escolher, como `pessoal` ou `trabalho`) que o roda numa janela do tmux.
2. Os hooks HTTP do Claude Code avisam o daemon quando a sessão começa, para, pede permissão ou recebe um prompt. Um pequeno wrapper da status line também envia o modelo, o esforço, o uso do contexto e os limites de uso — e depois roda a sua própria status line, então o terminal continua igual.
3. O daemon acompanha o transcript, lê o painel do tmux e entrega tudo ao app por um WebSocket autenticado, escutando **só** na interface do Tailscale.
4. Prompts e teclas voltam pelo tmux; respostas de permissão voltam pela requisição do hook pendente.

O **Codex CLI** funciona do mesmo jeito, pelos hooks de comando dele (`<CODEX_HOME>/hooks.json`) e pelos rollouts das sessões: iniciar, retomar, prompts, Permitir/Negar nos pedidos de permissão e a conversa, sem worktrees nem regras de "permitir sempre".

## Segurança

O daemon é, na prática, um shell remoto, então vem trancado: o WebSocket escuta **só na interface do Tailscale** (ou em `127.0.0.1` com `--dev` explícito) e toda conexão apresenta um token guardado no cofre de segredos do sistema; o endpoint dos hooks escuta só em `127.0.0.1` com um segredo local; o push não leva conteúdo da sessão; o `bypassPermissions` nunca é oferecido; e toda edição nos seus arquivos é mesclada, com backup, escrita atômica e desfeita pelo `remote-harness uninstall`. Os detalhes estão em [Segurança e privacidade](https://remoteharness.app/pt-br/docs/security/); para relatar uma vulnerabilidade, veja o [SECURITY.md](SECURITY.md).

## Início rápido

No computador (macOS, Linux ou WSL2), uma linha instala o daemon e abre um assistente que encontra suas contas do Claude Code, pergunta o alias de cada uma, instala os hooks e o serviço em segundo plano e mostra o QR de pareamento:

```bash
curl -fsSL https://remoteharness.app/install | bash     # macOS e Linux
irm https://remoteharness.app/install | iex             # PowerShell do Windows (instala o WSL2 se faltar)
```

Depois instale o app e o Tailscale no celular, leia o QR e use o seu alias no lugar de `claude`. Todo o resto está na [documentação](https://remoteharness.app/pt-br/docs/), em português, inglês e espanhol:

| Assunto | Onde |
|---|---|
| Requisitos, instalação no macOS, Linux e Windows (WSL2), instalação a partir de um clone | [Primeiros passos](https://remoteharness.app/pt-br/docs/getting-started/) |
| Instalar o app, parear, a primeira sessão, atualizar | [Primeiros passos](https://remoteharness.app/pt-br/docs/getting-started/#instalar-o-app) |
| Lista de sessões, prompts, permissões, terminal, worktrees, status ao vivo, ajustes, iPad | [Usando o app](https://remoteharness.app/pt-br/docs/using-the-app/) |
| Notificações e silêncio | [Usando o app](https://remoteharness.app/pt-br/docs/using-the-app/#notificacoes-e-silencio) |
| Comandos do CLI, o arquivo de configuração (`~/.remote-harness/config.json`), perfis do OpenRouter e do Codex | [O daemon](https://remoteharness.app/pt-br/docs/daemon/) |
| Serviço em segundo plano, atualizações e canais, ícone na barra de menus / bandeja, logs | [O daemon](https://remoteharness.app/pt-br/docs/daemon/#servico-em-segundo-plano) |
| O que sai da sua máquina, tokens, seus arquivos, relatórios de erro | [Segurança e privacidade](https://remoteharness.app/pt-br/docs/security/) · [Política de privacidade](https://remoteharness.app/pt-br/docs/privacy/) |
| Serviço e lingering no Linux, WSL2 (systemd, tarefa de logon, Tailscale), suspensão, push, sessões somente leitura | [Solução de problemas](https://remoteharness.app/pt-br/docs/troubleshooting/) |
| Desinstalar: `remote-harness service uninstall` e depois `remote-harness uninstall` | [O daemon](https://remoteharness.app/pt-br/docs/daemon/#comandos) |

## Desenvolvimento

```bash
pnpm install
pnpm check                                             # typecheck + testes + Biome no monorepo
pnpm --filter @remote-harness/daemon dev start --dev    # daemon do código-fonte em 127.0.0.1
pnpm --filter @remote-harness/mobile ios               # app no simulador iOS (android: emulador)
```

`make` lista os atalhos. Compilar e assinar o app, os alvos do Makefile e os links de instalação, o Firebase nos seus próprios builds, o relay de push, as atualizações pelo ar e o deploy do site estão no [CONTRIBUTING.md → Building and releasing](CONTRIBUTING.md#building-and-releasing) (em inglês), assim como o fluxo de contribuição. Arquitetura e convenções ficam no [CLAUDE.md](CLAUDE.md); o PRD original (em português, de quando o projeto se chamava Claude Remote) está em [`.docs/prd.md`](.docs/prd.md).

## Licença

[MIT](LICENSE) © Marco Filho

<sub>O Remote Harness é um projeto independente, sem afiliação, endosso ou patrocínio da Anthropic ou da OpenAI. "Claude" e "Claude Code" são marcas da Anthropic, PBC; "Codex" é marca da OpenAI.</sub>
