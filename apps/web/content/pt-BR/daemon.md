---
title: O daemon
description: Comandos da CLI, o arquivo de configuração, o serviço em segundo plano, atualizações e canais, o ícone na bandeja, logs.
applies: 0.7+
---

O daemon roda no computador: acompanha os transcripts das sessões, controla o tmux, recebe os hooks do Claude Code em `127.0.0.1` e atende o app por um WebSocket preso à interface do Tailscale. `remote-harness --help` é a fonte da verdade para os comandos.

## Comandos

| Comando | O que faz |
| --- | --- |
| `remote-harness setup` | Instalação guiada: contas e aliases, hooks, serviço, pareamento. `--yes` mantém a configuração, `--lang` escolhe o idioma. |
| `remote-harness start` | Roda o daemon em primeiro plano. `--dev` prende a `127.0.0.1`, `--host` define o endereço, `--wait-tailscale` espera a interface. |
| `remote-harness pair` | Mostra o QR code de pareamento (endereço e token). `--dev` para `127.0.0.1`. |
| `remote-harness rotate-token` | Token novo; todos os celulares precisam parear de novo. |
| `remote-harness doctor` | Confere as ferramentas, o Tailscale, a configuração, os perfis e as chaves de provedor, o cofre do token, o serviço, o push e os celulares registrados. |
| `remote-harness install` / `uninstall` | Instala ou remove os atalhos, a entrada no `PATH`, os hooks e o wrapper da status line, sem perguntas. |
| `remote-harness service install` / `uninstall` / `status` | O serviço em segundo plano: um LaunchAgent do launchd no macOS, uma unidade de usuário do systemd no Linux e no WSL. |
| `remote-harness update` | Baixa a nova versão, recompila, atualiza os hooks e reinicia o serviço. `--ref <branch|tag>` escolhe a versão. |
| `remote-harness updates status` / `check` / `channel [main|development]` / `auto on|off` | A verificação de atualizações em segundo plano. |
| `remote-harness push status` / `test` | Modo de push em uso e celulares registrados; envia uma notificação de teste. |
| `remote-harness push off` / `on` | Para (ou volta a enviar) todos os pushes e o status ao vivo deste computador, sem reiniciar o daemon. |
| `remote-harness provider key <perfil>` | Guarda a chave do provedor (OpenRouter) de um perfil no cofre do sistema. `--stdin` lê de um pipe. |
| `remote-harness rules list` / `undo <id>` | As regras "permitir sempre" criadas pelo celular. |

O comando antigo `claude-remote` e as variáveis `CLAUDE_REMOTE_*` continuam funcionando em instalações feitas antes da mudança de nome.

## Arquivo de configuração

`~/.remote-harness/config.json` (instalações anteriores à mudança de nome continuam usando `~/.claude-remote`):

```json
{
  "profiles": [
    { "id": "pessoal", "name": "Pessoal", "configDir": "~/.claude", "color": "#D97757" },
    { "id": "trabalho", "name": "Trabalho", "configDir": "~/.claude-work", "color": "#61AFEF" }
  ],
  "wsPort": 7337,
  "hookPort": 7338,
  "defaultRuleScope": "project",
  "permissionTimeoutSec": 280,
  "questionTimeoutSec": 3300,
  "inputStrategy": "paste",
  "recentDays": 7,
  "tmuxSession": "claude-remote",
  "push": "auto",
  "update": { "channel": "main", "auto": false },
  "tray": true
}
```

- `profiles`: um por conta do Claude Code. `id` é o alias (o nome do atalho), `configDir` o `CLAUDE_CONFIG_DIR` da conta, `color` a cor da etiqueta no app. Opcionais: `agent` (`claude` por padrão) e `provider` (abaixo).
- `wsPort`, `hookPort`: as portas do app e dos hooks.
- `defaultRuleScope`: para onde vão as regras "permitir sempre" por padrão, `project` ou `user`.
- `permissionTimeoutSec`: quanto tempo o daemon segura um pedido de permissão para o celular antes de o diálogo do terminal assumir. O pedido continua no app como "Responda no terminal" até a sessão seguir.
- `questionTimeoutSec`: o mesmo para perguntas e aprovação de plano (3300 por padrão). Uma pergunta ainda aberta depois de 10 minutos manda um push de lembrete. O timeout do hook gravado nas configurações do agente cobre os dois, e `remote-harness install` ou `update` o reescreve.
- `inputStrategy`: `paste` (padrão) ou `type` para os prompts enviados pelo celular.
- `recentDays`: até quando sessões encerradas são listadas.
- `tmuxSession`: a sessão do tmux que os atalhos usam.
- `language`: `pt-BR`, `en-US` ou `es-ES` para a CLI, a instalação e os textos de push; o idioma do sistema quando ausente.
- `push`: `auto` (a sua conta de serviço do Firebase quando existe, senão o relay) ou `off`.
- `update`: o canal que `update` e a verificação seguem, e se as atualizações se aplicam sozinhas.
- `tray`: o ícone na barra de menus / bandeja.
- `trayPermissions`: se a bandeja oferece Permitir / Sempre permitir / Negar para uma permissão pendente (ligado por padrão; também nas Preferências da bandeja).

Mudanças no arquivo valem quando o daemon reinicia (`remote-harness service install` de novo, ou reiniciar pela bandeja).

## Perfis e OpenRouter

Um perfil pode rotear o Claude Code pelo OpenRouter em vez da conta Anthropic. O jeito mais fácil é `remote-harness setup` → "Adicionar um perfil OpenRouter": ele pergunta o nome, o alias, a pasta (`~/.claude-openrouter`), um modelo padrão opcional e a chave (oculta), confere a chave com o OpenRouter e mostra os créditos restantes quando a chave consegue lê-los. Rodar o setup de novo lista esses perfis e deixa manter, trocar a chave ou remover o perfil (o atalho, os hooks e a chave; a pasta fica).

À mão: acrescente um `provider` com `kind: "openrouter"` e, opcionalmente, `baseUrl` (outro gateway compatível com a Anthropic), um `model` padrão e um `smallFastModel`.

```json
{
  "id": "openrouter",
  "name": "OpenRouter",
  "configDir": "~/.claude-openrouter",
  "color": "#8A8784",
  "provider": { "kind": "openrouter", "model": "anthropic/claude-sonnet-5.5" }
}
```

Depois, `remote-harness install` regenera os atalhos e `remote-harness provider key openrouter` guarda a chave no mesmo lugar do token de pareamento (Keychain no macOS, Secret Service ou arquivo `0600` no Linux). O atalho lê a chave só dentro da janela do tmux, nunca numa linha de comando, e o daemon só a usa para mostrar os seus créditos no app. O `doctor` informa se cada perfil com provedor tem chave.

## Perfis do Codex

Um perfil pode rodar o OpenAI Codex CLI em vez do Claude Code: defina `"agent": "codex"` e aponte `configDir` para a pasta do Codex (`CODEX_HOME`, `~/.codex` por padrão). O `remote-harness setup` oferece `~/.codex` quando o Codex já o usou.

```json
{ "id": "cdx", "name": "Codex", "configDir": "~/.codex", "color": "#2FBF8F", "agent": "codex" }
```

O `remote-harness install` grava o atalho do perfil (ele abre o `codex` com o `CODEX_HOME` certo) e mescla os hooks do daemon em `<CODEX_HOME>/hooks.json`, ao lado dos seus e com backup; o seu `config.toml` não é alterado. **O Codex pede uma vez para confiar em hooks novos**: abra o `codex` e escolha "Trust all and continue" (ou revise em `/hooks`). Até lá, as sessões dele aparecem somente leitura e as aprovações ficam no terminal. O `doctor` verifica se o `codex` está no `PATH` e se os hooks estão instalados.

O que funciona como no Claude Code: a lista de sessões (rollouts recentes em `sessions/`), a conversa, prompts, fotos e teclas, iniciar e retomar pelo celular, push, status ao vivo e aprovações com Permitir / Negar. Diferenças: o chip de modo mostra a política de aprovação e só muda com `/permissions` no terminal, não há "Sempre" (hooks do Codex não criam regras), nem opção de worktree, nem provedor.

## Atalhos e aliases

Cada perfil ganha um pequeno atalho em zsh em `~/.remote-harness/bin/<alias>` (adicionado ao `PATH` em `~/.zshrc` e `~/.bashrc`). Rode o alias em vez de `claude`, com os mesmos argumentos: ele abre o Claude Code numa janela da sessão `claude-remote` do tmux com o `CLAUDE_CONFIG_DIR` certo e prende o seu terminal nela. O comando `claude` puro nunca é alterado.

## Serviço em segundo plano

`remote-harness service install` mantém o daemon rodando depois que você fecha o terminal e o inicia no login: um LaunchAgent no macOS (aparece como item de login), uma unidade de usuário do systemd no Linux (`~/.config/systemd/user/claude-remote.service`). Em servidores Linux acessados por SSH, a instalação oferece `loginctl enable-linger`, para o serviço sobreviver ao logout. Sem systemd (contêineres, alguns WSL) rode `remote-harness start` você mesmo, por exemplo numa janela do tmux. No WSL a instalação também pode criar uma tarefa agendada do Windows que inicia a distribuição no logon.

`remote-harness service status` mostra se está carregado; o menu da bandeja reinicia.

## Atualizações e canais

O serviço confere o canal dele no remoto git a cada 6 horas e mostra uma notificação na área de trabalho quando há versão nova (nunca num clone de desenvolvimento). `remote-harness update` aplica; `remote-harness updates auto on` deixa o daemon se atualizar sozinho, só quando nenhuma sessão está rodando ou esperando e nenhuma permissão está pendente, e nunca para uma versão mais antiga. `remote-harness updates channel development` segue a branch de integração; voltar para `main` avisa que instala uma versão mais antiga.

## Ícone na bandeja

O daemon do serviço mostra um ícone na barra de menus do macOS (um pequeno auxiliar em Swift compilado no primeiro início com as Command Line Tools) e um ícone na bandeja do Linux (`python3` com GTK 3 e AyatanaAppIndicator3 ou AppIndicator3). O menu mostra as sessões em andamento e as permissões pendentes (responda por ali), abre uma sessão nova, mostra o código de pareamento, confere ou aplica atualizações, escolhe o canal, abre os logs, a configuração e a documentação, e reinicia o daemon. **Parear um celular** mostra o QR de pareamento no próprio menu no macOS, o endereço, o pareamento no terminal e **Trocar o token…** (os celulares pareados precisam parear de novo). **Preferências** liga e desliga as respostas de permissão no menu, o modo de manter acordado e as notificações push, aplicados na hora, e abre o arquivo de configuração para o resto. Com o serviço, **Sair** esconde o ícone ou para o serviço até o próximo login. `"tray": false` desliga; sem o auxiliar, e no WSL, o daemon roda sem interface.

## Dados e logs

Tudo o que o daemon guarda fica em `~/.remote-harness/`: `config.json`, `state.json` (as sessões conhecidas), `secrets/` (chaves de provedor quando o cofre é o arquivo), `models-cache.json`, `bin/` (atalhos), `logs/` e `src/` (o código que o instalador compilou). Anexe os logs a um relato de bug depois de remover tokens e conteúdo de sessões.

Variáveis de ambiente: `REMOTE_HARNESS_HOME` muda a pasta de dados, `REMOTE_HARNESS_TOKEN_STORE=keychain|secret-tool|file` força o cofre do token, `REMOTE_HARNESS_LANG` define o idioma.
