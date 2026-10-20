# PRD — Remote Harness

> Documento original do produto, escrito quando o projeto ainda se chamava **Claude Remote** (o nome mudou para Remote Harness na v0.7.0). Fica como registro histórico: o estado atual está no [README](../README.md) e nas specs em `openspec/specs/`.

| | |
|---|---|
| **Status** | Rascunho (histórico) |
| **Data** | 2026-10-13 |
| **Autor** | Marco Filho |
| **Nome de trabalho** | Claude Remote (hoje Remote Harness) |

## 1. Resumo

App mobile pessoal (React Native + Expo) que se conecta a um daemon rodando no Mac para acompanhar e controlar sessões interativas do Claude Code que já estão em execução, sem usar o `claude /rc`. Suporta múltiplos perfis de configuração na mesma máquina (`~/.claude` e `~/.claude-doctorx`) em uma única interface.

## 2. Problema

- O `/rc` notifica todos os dispositivos da conta, inclusive os que não deveriam receber nada.
- O `/rc` trabalha com uma conta por vez; não há visão unificada das sessões de dois logins diferentes.
- Não existe API pública para se anexar a uma sessão interativa do Claude Code a partir de outro processo.

## 3. Objetivos

1. Entrar pelo celular em uma sessão viva do Claude Code, vendo o mesmo histórico e enviando prompts para o mesmo processo que está aberto no Mac.
2. Listar e alternar entre sessões dos dois perfis em uma única lista.
3. Aprovar ou negar pedidos de permissão pelo celular, inclusive com "permitir sempre".
4. Trocar o modo de permissão da sessão pelo celular (padrão, aceitar edições, plano, auto).
5. Receber notificações apenas no aparelho registrado no app.
6. Conteúdo das sessões trafegando só entre o celular e o Mac. A única exceção é o push, que passa por FCM/APNs e por isso carrega apenas título, perfil e identificador da sessão.

## 4. Fora de escopo

- Distribuição para outras pessoas ou publicação em loja.
- Login claude.ai dentro do app ou chamadas diretas à API da Anthropic a partir do celular.
- Capturar sessões iniciadas fora do tmux (limitação do macOS).
- Edição de arquivos ou navegador de código no celular.
- Suporte a Windows/Linux no daemon (v1 só macOS).
- Android (v1 só iOS; a escolha de RN + FCM mantém o caminho aberto).

## 5. Usuário e cenários

Usuário único: o dono do Mac, com duas contas do Claude Code.

- **Acompanhar tarefa longa**: iniciou uma tarefa no Mac, saiu da mesa e quer ver o progresso e responder quando o Claude perguntar algo.
- **Destravar permissão**: o Claude parou pedindo aprovação de um comando; o usuário aprova pelo celular e a tarefa continua.
- **Novo prompt à distância**: a tarefa terminou; o usuário manda a próxima instrução pelo celular na mesma sessão.
- **Alternar contas**: ver, lado a lado, sessões do perfil pessoal e do perfil doctorx.

## 6. Arquitetura

```
┌────────────┐   WebSocket (Tailscale)   ┌─────────────────────────────┐
│ App RN/Expo│ ◄───────────────────────► │ Daemon (Node/TS) no Mac     │
└────────────┘                           │  ├─ tmux: send-keys/capture │
      ▲                                  │  ├─ watcher dos .jsonl      │
      │ push (FCM → APNs)                │  └─ endpoint HTTP p/ hooks  │
      └──────────────────────────────────┤                             │
                                         └──────────┬──────────────────┘
                                                    │
                              ┌─────────────────────┴─────────────────────┐
                              │ tmux                                      │
                              │  ├─ janela: claudin  (CLAUDE_CONFIG_DIR=~/.claude)         │
                              │  └─ janela: drclaude (CLAUDE_CONFIG_DIR=~/.claude-doctorx) │
                              └───────────────────────────────────────────┘
```

### 6.1 Componentes

| Componente | Responsabilidade |
|---|---|
| **Launchers** (`claudin`, `drclaude`) | Comandos que abrem o `claude` dentro de uma janela tmux nomeada, com o `CLAUDE_CONFIG_DIR` do perfil, e registram a sessão no daemon. Repassam todos os argumentos ao `claude`. O `claude` puro continua existindo, fora do tmux. |
| **Daemon** | Processo Node/TS (launchd). Mantém o registro de sessões, acompanha transcripts, injeta entrada via tmux, recebe hooks, serve o WebSocket e dispara push. |
| **Hooks** | Entradas no `settings.json` de cada perfil (`SessionStart`, `SessionEnd`, `Stop`, `SubagentStop`, `Notification`, `PermissionRequest`) que chamam o endpoint local do daemon. |

### 6.1.1 Perfis

| Launcher | Perfil | `CLAUDE_CONFIG_DIR` |
|---|---|---|
| `claudin` | Pessoal | `~/.claude` |
| `drclaude` | DoctorX | `~/.claude-doctorx` |

O mapeamento acima é uma suposição a confirmar. Os dois diretórios já existem na máquina; os aliases não foram encontrados no `~/.zshrc` e serão criados pelo instalador do projeto.
| **App** | Cliente Expo: lista de sessões, tela de conversa, aprovações, terminal bruto, configurações. |

### 6.2 Fluxos principais

- **Saída**: o daemon faz tail do `<config dir>/projects/<projeto>/<session-id>.jsonl` e transmite cada entrada ao app como evento estruturado. Para o que não está no transcript (texto em streaming, menus da TUI), usa `tmux capture-pane`.
- **Entrada**: o app envia o prompt inteiro; o daemon o cola na janela da sessão (`tmux load-buffer` + `paste-buffer -p`) e só então manda Enter. Colar em vez de digitar tecla a tecla evita que `@` e `/` abram o autocomplete da própria TUI e que o Enter escolha uma sugestão em vez de enviar; também preserva prompts com várias linhas. Teclas especiais (Enter, Esc, setas, Ctrl+C) continuam com comandos dedicados via `send-keys`.
- **Autocomplete de arquivos (`@`)**: ao digitar `@`, o app manda o trecho ao daemon, que lista os arquivos do `cwd` da sessão com `rg --files` ou `git ls-files` (respeitam o `.gitignore`), aplica filtro fuzzy e devolve os 20 melhores, pastas incluídas. O app insere `@caminho/do/arquivo` no texto; quem resolve a menção é o Claude Code, ao receber o prompt.
- **Autocomplete de skills e comandos (`/`)**: o daemon monta a lista por sessão lendo o frontmatter (`name`, `description`) de `<config dir>/skills/*/SKILL.md`, `<config dir>/commands/*.md`, `.claude/skills` e `.claude/commands` do projeto e dos plugins instalados no perfil, somando uma lista fixa dos comandos nativos (`/clear`, `/compact`, `/model` etc.). A lista difere entre perfis e entre projetos; fica em cache com watcher nos diretórios de origem.
- **Permissões**: o hook `PermissionRequest` dispara só quando o Claude realmente mostraria um diálogo de permissão, então respeita o modo atual e as regras já gravadas. Ele envia o pedido ao daemon e fica aguardando; o daemon notifica o app e a resposta volta como allow/deny. Se estourar o tempo limite, o hook não decide nada e o diálogo aparece normalmente na TUI. (Na v1 anterior deste documento o hook era `PreToolUse`; ele dispara em toda tool call, inclusive as que o modo já aprovaria, e por isso foi trocado.)
- **Permitir sempre**: a resposta do app pode incluir uma regra (por exemplo `Bash(pnpm test:*)`). O daemon grava a regra em `permissions.allow` no escopo escolhido no app: `settings.json` do perfil (todas as sessões daquele perfil) ou `.claude/settings.local.json` do projeto (só aquele repositório).
- **Modo de permissão**: o modo atual vem no campo `permission_mode` do payload dos hooks e é confirmado pela linha de status via `capture-pane`. Para trocar, o daemon envia Shift+Tab (`tmux send-keys BTab`) e relê o modo, repetindo até chegar ao modo pedido ou desistir após um ciclo completo. Os modos oferecidos são os que o ciclo do Shift+Tab expõe naquele perfil (padrão, aceitar edições, plano, auto); `bypassPermissions` não é oferecido pelo celular.
- **Subagentes e background**: subagentes aparecem aninhados sob a sessão pai, a partir das entradas sidechain do transcript e do hook `SubagentStop`. Sessões em background e comandos em background de uma sessão aparecem na lista com selo próprio; as que não têm janela tmux ficam como somente leitura.
- **Vínculo sessão ↔ janela**: o hook `SessionStart` informa `session_id`, `transcript_path` e `cwd`; o launcher informa a janela tmux e o perfil. O daemon junta os dois.

## 7. Requisitos funcionais

### Daemon

| ID | Requisito | Prioridade |
|---|---|---|
| D1 | Registrar perfis configuráveis (nome, `CLAUDE_CONFIG_DIR`, cor). | P0 |
| D2 | Listar sessões ativas (em tmux) e recentes (só transcript) de todos os perfis. | P0 |
| D3 | Transmitir o transcript de uma sessão em tempo real, com histórico paginado. | P0 |
| D4 | Injetar o prompt por colagem (`paste-buffer -p`) e teclas especiais por `send-keys` na sessão via tmux. | P0 |
| D15 | Buscar arquivos e pastas no `cwd` da sessão com filtro fuzzy, respeitando o `.gitignore`. | P1 |
| D16 | Listar skills e comandos disponíveis por sessão (perfil, projeto, plugins e nativos), com cache e watcher. | P1 |
| D5 | Receber hooks e intermediar decisões de permissão com tempo limite. | P0 |
| D6 | Autenticar clientes por token; recusar conexões fora da interface Tailscale. | P0 |
| D7 | Enviar push via Firebase Cloud Messaging (`firebase-admin`) em `Stop`, `Notification` e pedido de permissão, só para os tokens de aparelho registrados. | P1 |
| D12 | Gravar regra de "permitir sempre" no `settings.json` do perfil ou no `settings.local.json` do projeto, preservando o restante do arquivo. | P0 |
| D13 | Ler e trocar o modo de permissão de uma sessão ativa, confirmando o modo resultante. | P0 |
| D14 | Listar subagentes (aninhados na sessão pai) e sessões/tarefas em background. | P1 |
| D8 | Iniciar nova sessão em um perfil e diretório escolhidos. | P1 |
| D9 | Retomar sessão recente (`claude --resume <id>`) em nova janela tmux. | P1 |
| D10 | Expor o conteúdo bruto do painel (capture-pane) em stream. | P1 |
| D11 | Iniciar com o sistema via launchd e se recuperar de reinício do tmux. | P2 |

### App

| ID | Requisito | Prioridade |
|---|---|---|
| A1 | Pareamento com o daemon por QR code (endereço + token). | P0 |
| A2 | Lista de sessões agrupada por perfil, com estado (rodando, aguardando, ociosa). | P0 |
| A3 | Tela de conversa: mensagens, tool calls recolhíveis, diffs, markdown. | P0 |
| A4 | Campo de prompt e botões de Esc/interromper. | P0 |
| A5 | Cartão de aprovação de permissão (permitir / permitir sempre / negar) com detalhes do comando. Em "permitir sempre", mostra a regra que será gravada e o escopo (perfil ou projeto) antes de confirmar. | P0 |
| A11 | Seletor de modo de permissão na tela da sessão, mostrando o modo atual e pedindo confirmação ao entrar em modo auto. | P0 |
| A12 | Subagentes aninhados na sessão pai e selo para sessões/tarefas em background. | P1 |
| A13 | Sugestões de arquivos e pastas ao digitar `@` no campo de prompt, com busca incremental. | P1 |
| A14 | Sugestões de skills e comandos ao digitar `/`, com nome, descrição e origem (perfil, projeto, plugin, nativo). | P1 |
| A15 | Comandos que abrem menu na TUI (`/model`, `/config`) levam à aba de terminal bruto em vez de serem enviados às cegas. | P1 |
| A6 | Reconexão automática e retomada do ponto em que parou. | P0 |
| A7 | Notificações push (FCM) com deep link para a sessão e ações de permitir/negar na própria notificação. | P1 |
| A8 | Aba de terminal bruto (xterm.js em WebView) como fallback. | P1 |
| A9 | Criar nova sessão / retomar sessão recente. | P1 |
| A10 | Silenciar notificações por perfil ou por sessão. | P2 |

## 8. Requisitos não funcionais

- **Segurança**: o daemon equivale a um shell remoto. Escuta só na interface Tailscale, exige token em toda conexão, guarda o token no Keychain (Mac) e no SecureStore (app). O endpoint de hooks escuta só em `127.0.0.1`.
- **Latência**: entrada do celular refletida na sessão em menos de 300 ms na mesma tailnet; eventos do transcript no app em menos de 1 s.
- **Resiliência**: queda do app ou do daemon não afeta a sessão do Claude, que continua viva no tmux.
- **Isolamento do parser**: o formato do `.jsonl` é interno e pode mudar; o parser fica em um módulo único, tolerante a campos desconhecidos, com fallback para o terminal bruto.
- **Conformidade**: uso pessoal, dirigindo o CLI oficial na própria máquina. O app nunca lê nem transporta credenciais do Claude.

## 9. Stack

| Camada | Escolha |
|---|---|
| App | React Native + Expo (development build, iOS), TypeScript, Expo Router, TanStack Query, `@react-native-firebase/messaging`, expo-secure-store |
| Daemon | Node + TypeScript, `ws`, `chokidar` (watcher), tmux via CLI |
| Tipos compartilhados | Pacote comum com o protocolo WebSocket (monorepo pnpm) |
| Rede | Tailscale |
| Push | Firebase Cloud Messaging: `firebase-admin` no daemon (service account local), APNs por trás no iOS |

### 9.1 Pré-requisitos

- Conta Apple Developer paga: push no iOS exige chave APNs, que é enviada ao projeto Firebase.
- Projeto Firebase com app iOS registrado (`GoogleService-Info.plist`) e service account para o daemon.
- Development build do Expo; o Expo Go não carrega `@react-native-firebase`.
- `tmux` (já instalado em `/opt/homebrew/bin/tmux`).
- Tailscale no Mac e no iPhone (o CLI `tailscale` não foi encontrado no PATH do Mac; instalar ou confirmar o app).

## 10. Protocolo (esboço)

Cliente → daemon:

- `sessions.list`
- `session.subscribe { sessionId, sinceCursor? }`
- `session.input { sessionId, text }`
- `session.key { sessionId, key }`
- `permission.respond { requestId, decision, always?: { rule, scope: "profile" | "project" } }`
- `session.setMode { sessionId, mode }`
- `device.register { fcmToken }`
- `files.search { sessionId, query, limit? }` → `files.results { query, items: [{ path, kind: "file" | "dir" }] }`
- `commands.list { sessionId }` → `commands.results { items: [{ name, description, source }] }`
- `session.start { profile, cwd }` / `session.resume { profile, sessionId }`

Daemon → cliente:

- `sessions.snapshot [...]` / `session.updated {...}`
- `transcript.entry { sessionId, cursor, entry }`
- `pane.frame { sessionId, text }`
- `permission.request { requestId, sessionId, tool, input, suggestedRule }`
- `session.state { sessionId, state, permissionMode }`
- `subagent.updated { sessionId, agentId, state }`

## 11. Marcos

| Marco | Entrega |
|---|---|
| **M0 — Prova de conceito** | Launcher + daemon mínimo: tail do `.jsonl` e `send-keys` via script de linha de comando, para um perfil. Valida a viabilidade técnica. |
| **M1 — MVP** | Requisitos P0: dois perfis, lista de sessões, conversa em tempo real, entrada, aprovações via hook com "permitir sempre", troca de modo de permissão, pareamento e token. |
| **M2 — Uso diário** | P1: push via FCM, terminal bruto, iniciar/retomar sessões, subagentes e background na lista, autocomplete de `@` e `/`. |
| **M3 — Acabamento** | P2: launchd, silenciar por perfil, ajustes de UI. |

## 12. Riscos

| Risco | Mitigação |
|---|---|
| Formato do transcript muda em uma atualização do Claude Code | Parser isolado e tolerante; terminal bruto como fallback; fixar versão do CLI se necessário. |
| `send-keys` chega quando a TUI está em um diálogo inesperado | Verificar o estado com `capture-pane` antes de injetar; expor o terminal bruto para destravar. |
| Tempo limite do hook de permissão menor que o tempo de resposta no celular | Configurar `timeout` do hook; ao expirar, não decidir e deixar o diálogo na TUI, respondível via teclas. |
| Sessão iniciada fora do tmux não aparece como controlável | `claudin` e `drclaude` como caminho padrão; app mostra as demais como "somente leitura / retomar". |
| Troca de modo por Shift+Tab cai no modo errado (o ciclo varia por versão e por perfil) | Sempre reler o modo após cada tecla e parar no alvo; nunca assumir a ordem do ciclo; mostrar no app o modo confirmado, não o pedido. |
| Colagem do prompt não se comporta como esperado na TUI (menção `@` não resolvida, Enter não envia) | Validar no M0 com prompts contendo `@`, `/` e várias linhas; fallback para `send-keys -l` seguido de Esc para fechar o menu antes do Enter. |
| Lista de comandos incompleta: prompts de servidores MCP viram comandos `/` mas não estão em disco | Verificar no M0 se a mensagem inicial do modo headless (`claude -p --output-format stream-json`) traz a lista completa; se trouxer, usá-la como fonte por perfil e projeto. O campo aceita texto livre, então um comando fora da lista ainda pode ser digitado. |
| Lista fixa de comandos nativos desatualiza a cada versão do Claude Code | Manter a lista em um arquivo único do daemon e revisá-la nas atualizações do CLI. |
| Busca de arquivos lenta em repositórios grandes | Índice em memória por `cwd` com watcher, limite de resultados e debounce no app. |
| Regra de "permitir sempre" ampla demais gravada por um toque no celular | Mostrar a regra exata e o escopo antes de confirmar; registrar no daemon as regras criadas pelo app, com opção de desfazer. |
| Modo auto ativado à distância sem ninguém olhando o Mac | Confirmação explícita no app; `bypassPermissions` fora do seletor. |
| Conteúdo sensível em notificações (passa por FCM/APNs) | Payload só com título genérico, perfil e id da sessão; o detalhe é buscado no daemon ao abrir. |
| Comportamento do hook `PermissionRequest` ou do campo `permission_mode` difere do esperado na versão instalada | Validar os dois no M0; fallback para `PreToolUse` + leitura do modo via `capture-pane`. |
| Exposição do daemon | Bind só no Tailscale, token obrigatório, rotação de token pelo app. |

## 13. Questões em aberto

1. Confirmar o mapeamento `claudin` → `~/.claude` e `drclaude` → `~/.claude-doctorx`.
2. Escopo padrão do "permitir sempre": perfil inteiro ou só o projeto?
3. Há conta Apple Developer paga disponível para a chave APNs?

### Decisões tomadas (2026-10-13)

| Tema | Decisão |
|---|---|
| Push | Firebase Cloud Messaging |
| Plataforma | Só iOS por enquanto |
| Launchers | `claudin` e `drclaude` |
| "Permitir sempre" | Sim, grava regra no settings; o app também troca o modo de permissão (auto, aceitar edições etc.) |
| Subagentes e background | Entram na lista |

## 14. Critérios de sucesso

- Uma sessão aberta no Mac é acompanhada e controlada pelo celular sem nenhum outro dispositivo ser notificado.
- Sessões dos dois perfis aparecem e funcionam na mesma lista.
- Um pedido de permissão é respondido pelo celular e a tarefa prossegue sem tocar no Mac.
- Uma regra de "permitir sempre" criada no celular evita o próximo pedido igual.
- O modo de permissão trocado no celular aparece na linha de status da TUI no Mac.
- Um prompt com `@arquivo` e um com `/skill`, ambos escolhidos pelo autocomplete do app, são interpretados pela sessão como se tivessem sido digitados no Mac.
- Uma semana de uso diário sem precisar recorrer ao `/rc`.
