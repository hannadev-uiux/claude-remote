<div align="center">

<img src="apps/mobile/assets/icon.png" width="112" alt="Ícone do Claude Remote" />

# Claude Remote

**Acompanhe e controle pelo iPhone as sessões do Claude Code que estão rodando no seu Mac ou Linux.**

Auto-hospedado: um daemon pequeno no computador, um app nativo no celular e um link privado do Tailscale entre os dois.<br/>Sem relay na nuvem, sem notificação para a conta inteira, todos os perfis do Claude Code numa lista só.

[English](README.md) · [Contribuindo](CONTRIBUTING.md) · [Segurança](SECURITY.md)

</div>

<p align="center">
  <img src="docs/screenshots/sessions.png" width="23%" alt="Lista de sessões" />
  <img src="docs/screenshots/conversation.png" width="23%" alt="Conversa" />
  <img src="docs/screenshots/permission.png" width="23%" alt="Pedido de permissão" />
  <img src="docs/screenshots/terminal.png" width="23%" alt="Terminal bruto" />
</p>

---

## Por quê

O Claude Code rende mais em tarefas longas e autônomas — justamente quando você sai da mesa. Aí ele para pedindo permissão para rodar `pnpm test` e a tarefa inteira espera você voltar.

O controle remoto nativo (`/rc`) ajuda, mas não atendia um uso real:

- **Notifica todos os dispositivos da conta**, inclusive os que não deveriam receber nada.
- **Trabalha com uma conta por vez.** Muita gente usa dois logins do Claude Code no mesmo Mac (pessoal e trabalho, via `CLAUDE_CONFIG_DIR`) e quer ver os dois juntos.
- **Não existe API pública para se anexar a uma sessão interativa** a partir de outro processo.

O Claude Remote resolve isso com ferramentas em que você já confia: as sessões rodam no **tmux**, o Claude Code avisa o que acontece pelos **hooks HTTP** nativos e um **daemon** local liga tudo ao celular pelo **Tailscale**.

## O que ele faz

- **Uma lista, todos os perfis** — sessões de todos os perfis, agrupadas por projeto, com estado ao vivo.
- **Conversa em tempo real** — markdown, raciocínio, tool calls, diffs e resultados, paginados.
- **Enviar prompts** — para o mesmo processo aberto no Mac, com `Esc` e `Ctrl+C`.
- **Aprovar permissões** — permitir, negar ou **permitir sempre** (a regra é gravada pelo próprio Claude Code e pode ser desfeita com `claude-remote rules undo`).
- **Trocar o modo de permissão** — padrão, aceitar edições, plano, auto. O `bypassPermissions` nunca é oferecido.
- **Autocomplete** — `@arquivos` e `/comandos` (projeto, perfil, plugins e nativos).
- **Terminal bruto** — xterm.js com o painel do tmux para menus da TUI.
- **Subagentes** — acompanhe subagentes e tarefas em segundo plano.
- **Iniciar e retomar** — nova sessão em qualquer projeto ou retomar uma somente leitura.
- **Push privado** — só no *seu* aparelho, sem conteúdo da sessão; silencie por perfil ou sessão.

## Como funciona

1. Você abre o Claude Code com um launcher (um por conta, com o nome que você escolher, como `pessoal` ou `trabalho`) que o roda numa janela do tmux.
2. Os hooks HTTP do Claude Code avisam o daemon quando a sessão começa, para, pede permissão ou recebe um prompt.
3. O daemon acompanha o transcript, lê o painel do tmux e entrega tudo ao app por um WebSocket autenticado, escutando **só** na interface do Tailscale.
4. Prompts e teclas voltam pelo tmux; respostas de permissão voltam pela requisição do hook pendente.

Detalhes de arquitetura, segurança, instalação e desenvolvimento estão no [README em inglês](README.md). O PRD original (em português) está em [`.docs/claude-remote-app.md`](.docs/claude-remote-app.md).

## Início rápido

```bash
curl -fsSL https://maarkn.dev/claude-remote/install.sh | bash
```

O instalador verifica os pré-requisitos, baixa e compila o daemon em `~/.claude-remote/src` e abre um assistente que encontra suas contas do Claude Code (ou cria uma nova: cria a pasta e abre o Claude Code nela para o login), pergunta o **alias** de cada uma (o comando que abre a conta no tmux, por exemplo `pessoal` e `trabalho`), instala hooks e serviço e mostra o QR de pareamento. Rode de novo para atualizar; `claude-remote setup` muda contas e aliases depois.

No iPhone, instale o app e o Tailscale (mesma conta do computador). Instalou o app primeiro? A tela de pareamento tem um passo a passo para configurar o computador.

Requisitos: macOS, Linux (de preferência com systemd) ou Windows 10 2004+/11 via WSL2 (veja abaixo); o instalador cuida do Node 24+, baixando um Node privado em `~/.claude-remote/node` se faltar, e de `tmux`, `rg`, `zsh` e `git` via Homebrew no macOS ou apt, dnf, pacman ou zypper no Linux, usando `sudo` só depois de explicar por quê. Também: Claude Code; Tailscale no computador e no iPhone.

### Linux

- **Serviço**: uma unit de usuário do systemd, `~/.config/systemd/user/claude-remote.service` (reinicia se cair, logs em `~/.claude-remote/logs`). Veja com `claude-remote service status` ou `systemctl --user status claude-remote`.
- **Lingering**: serviços de usuário param no logout. O assistente pergunta antes de rodar `loginctl enable-linger $USER`, que mantém o daemon rodando após o logout e o inicia no boot (necessário em servidores acessados por SSH).
- **Sem systemd** (containers, alguns WSL): o assistente avisa; rode `claude-remote start` você mesmo, por exemplo numa janela do tmux.
- **Token**: fica no Secret Service (GNOME Keyring, KWallet…) via `secret-tool` quando disponível; senão em `~/.claude-remote/token` (modo `0600`), caso dos servidores sem interface gráfica. `claude-remote doctor` mostra qual; `CLAUDE_REMOTE_TOKEN_STORE=secret-tool|file` força um deles.
- **Shell**: o `PATH` vai para `~/.bashrc` e/ou `~/.zshrc`; os launchers rodam com `zsh`.

### Windows (WSL2)

O Claude Remote controla o Claude Code pelo tmux, então no Windows ele roda dentro do **WSL2** (Linux no Windows). No PowerShell:

```powershell
irm https://maarkn.dev/claude-remote/install.ps1 | iex
```

O script verifica o Windows 10 2004+ ou Windows 11, instala o WSL2 com Ubuntu se faltar (o Windows pede permissão de administrador; reinicie se ele pedir e rode o mesmo comando de novo), ajuda a criar o usuário do Linux e roda o instalador do Linux dentro da distribuição. Opções: `& ([scriptblock]::Create((irm https://maarkn.dev/claude-remote/install.ps1))) -Distro Ubuntu-24.04 -Ref main -Yes -NoService`.

- **Node e Claude Code** precisam estar instalados **dentro do WSL** (não só no Windows); o instalador avisa o que falta.
- **systemd**: o serviço é uma unit de usuário do systemd, e o WSL só inicia o systemd com `[boot] systemd=true` em `/etc/wsl.conf`. O assistente mostra o comando `sudo` exato, só roda se você concordar (com backup) e pede para rodar `wsl --shutdown` no PowerShell.
- **Iniciar no logon**: o WSL só fica de pé enquanto algo o usa. O assistente pode criar uma Tarefa Agendada do Windows, "Claude Remote", que inicia a distribuição no logon (`wsl.exe -d <distro> --exec /bin/true`); `claude-remote service uninstall` a remove. Se o WSL ainda parar por ociosidade, aumente `vmIdleTimeout` em `[wsl2]` no `%UserProfile%\.wslconfig`.
- **Tailscale**: o WSL2 usa NAT por padrão, então um Tailscale no Windows não aparece dentro do WSL. Rode o Tailscale **dentro do WSL** (`curl -fsSL https://tailscale.com/install.sh | sh` e `sudo tailscale up`; funciona em qualquer Windows) ou mantenha-o no Windows e ative a **rede espelhada** (Windows 11 22H2+): o assistente pode adicionar `networkingMode=mirrored` em `[wsl2]` no `%UserProfile%\.wslconfig` (com backup); depois rode `wsl --shutdown`.
- `claude-remote doctor` mostra a distribuição, o modo de rede, o systemd e a tarefa de logon.

## Licença

[MIT](LICENSE) © Marco Filho

<sub>O Claude Remote é um projeto independente, sem afiliação, endosso ou patrocínio da Anthropic. "Claude" e "Claude Code" são marcas da Anthropic, PBC.</sub>
