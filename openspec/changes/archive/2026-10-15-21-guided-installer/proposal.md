## Why

Instalar exigia clonar o repositório, rodar `pnpm`, `build`, `install` e `service install` na mão, e os perfis vinham fixos (`claudin`/`drclaude`). Quem chega pelo repositório público precisa de uma instalação de uma linha, como a do Claude Code, que guie as escolhas e deixe nomear os launchers de cada conta.

## What Changes

- `install.sh` na raiz: `curl -fsSL https://maarkn.dev/claude-remote/install.sh | bash` verifica macOS/Node/git, instala `tmux`/`ripgrep` via Homebrew se faltarem, baixa ou atualiza o código em `~/.claude-remote/src`, compila o daemon e abre o assistente. Rodar de novo atualiza.
- `claude-remote setup`: assistente interativo com a logo do app no estilo da tela inicial do Claude Code. Detecta os diretórios `~/.claude*`, pergunta quais perfis controlar, o alias (nome do launcher) e o nome exibido de cada um, confirma, grava o `config.json` (mesclando), instala launchers/PATH/hooks, oferece o serviço e o pareamento. Perfis desmarcados têm launcher e hooks removidos. `--yes` roda sem perguntas.
- `claude-remote install` passa a reutilizar a mesma rotina de instalação.
- App: passo a passo na tela de pareamento para quem instalou o app primeiro (Tailscale no iPhone e no Mac, comando de instalação compartilhável, pareamento).
- `maarkn.dev/claude-remote/install.sh` redireciona (307) para o `install.sh` da `main` no GitHub.

## Capabilities

### New Capabilities
- `guided-installer`: instalação por uma linha e assistente de configuração de perfis.

### Modified Capabilities

## Impact

`install.sh`, app (pareamento), CLI do daemon (`features/setup`), nova dependência `@inquirer/prompts`, README, site `maarkn.dev` (redirect).
