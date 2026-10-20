import type { Messages } from './en-US.ts'

export const ptBR = {
  cli: {
    description: 'Daemon do Remote Harness: acompanhe e conduza seus agentes de código pelo celular',
    help: 'mostra a ajuda do comando',
    version: 'mostra a versão',
    buildMissing: 'Build não encontrado: rode `pnpm --filter @remote-harness/daemon build`.',
    unsupportedPlatform: (platform: string, supported: string) =>
      `Sistema não suportado (${platform}). O Remote Harness roda em ${supported}.`,
    start: {
      description: 'inicia o daemon',
      dev: 'escuta em 127.0.0.1 em vez do Tailscale',
      host: 'endereço de escuta do WebSocket',
      waitTailscale:
        'aguarda a interface do Tailscale em vez de falhar (usado pelo serviço em segundo plano)',
    },
    pair: {
      description: 'mostra o QR code de pareamento (endereço + token)',
      dev: 'usa 127.0.0.1',
      host: 'endereço a anunciar no QR',
      tailscaleNotFound:
        'Tailscale não encontrado (nenhuma interface 100.x). Instale e conecte o Tailscale, ou use --dev para 127.0.0.1.',
      simulatorHint: (port: number) =>
        'Para testar localmente (por exemplo, no simulador do iOS): `remote-harness start --dev` e `remote-harness pair --dev`' +
        ` (emulador Android: também \`adb reverse tcp:${port} tcp:${port}\`).`,
      scan: 'Escaneie com o app Remote Harness. Não compartilhe este código.',
    },
    setup: {
      description: 'assistente: escolhe contas e aliases, instala hooks, serviço e pareia o celular',
      yes: 'sem perguntas: mantém o config ou usa as contas encontradas',
      noService: 'não instala o serviço em segundo plano',
      lang: (codes: string) => `idioma (${codes}); pula a pergunta`,
      invalidLang: (value: string, codes: string) => `Idioma desconhecido "${value}". Use um de: ${codes}.`,
      interrupted:
        'Instalação interrompida. O que já foi mostrado como ✓ ficou feito; rode `remote-harness setup` de novo quando quiser.',
    },
    rotateToken: {
      description: 'gera um novo token e derruba as conexões existentes',
      rotated: 'Token trocado; conexões encerradas.',
      rotatedOffline: 'Token trocado (daemon não está rodando).',
      pairAgain: 'Rode `remote-harness pair` para parear de novo.',
    },
    provider: {
      description: 'provedores de modelo dos perfis (chave do OpenRouter)',
      key: 'guarda a chave do provedor de um perfil no cofre do sistema (nunca em arquivo nosso)',
      stdin: 'lê a chave da entrada padrão em vez de perguntar',
      prompt: (provider: string) => `Chave de API do ${provider}:`,
      unknownProfile: (id: string) => `Não há perfil "${id}" na configuração.`,
      noProvider: (id: string) =>
        `O perfil "${id}" não tem provedor. Adicione "provider": { "kind": "openrouter" } a ele no config.json antes.`,
      empty: 'Nenhuma chave informada; nada foi guardado.',
      saved: (id: string, store: string) =>
        `Chave do perfil ${id} guardada ${store}. As novas sessões do perfil passam a usá-la.`,
    },
    keepAwake: {
      description: 'mostra ou define quando o computador fica acordado: off, sessions ou always',
      modes: {
        off: 'desligado',
        sessions: 'enquanto há sessões ativas (e 10 min depois)',
        always: 'sempre, enquanto o daemon roda',
      },
      current: (mode: string) => `manter acordado: ${mode}`,
      holding: 'segurando o computador acordado agora',
      notHolding: 'sem segurar agora',
      unavailable: (reason: string) => `o auxiliar de energia não está disponível: ${reason}`,
      invalid: (value: string, valid: string) => `"${value}" não é um modo; use um destes: ${valid}`,
      applied: 'aplicado ao daemon em execução',
      notRunning: 'o daemon não está rodando; vale no próximo início',
    },
    doctor: {
      description: 'verifica dependências e configuração',
      notOnPath: 'não encontrado no PATH',
      tailscaleMissing: 'interface 100.x não encontrada',
      profile: (id: string, configDir: string) => `perfil ${id} (${configDir})`,
      dirMissing: 'diretório não existe',
      daemonRunning: 'daemon rodando',
      runStart: 'rode `remote-harness start`',
      token: (store: string) => `token ${store}`,
      tokenStores: {
        keychain: 'no Keychain do macOS',
        secretTool: 'no Secret Service (secret-tool)',
        file: (path: string) => `no arquivo ${path} (0600)`,
      },
      runPair: 'rode `remote-harness pair`',
      providerKey: (id: string, provider: string) => `chave do ${provider} do perfil ${id}`,
      runProviderKey: (id: string) => `rode \`remote-harness provider key ${id}\``,
      codexHooks: (id: string, path: string) => `hooks do Codex do perfil ${id} (${path})`,
      codexAccountWithoutProfile: (dir: string) =>
        `Conta do Codex encontrada em ${dir} sem um perfil. Rode \`remote-harness setup\` para adicioná-la.`,
      runInstall: 'rode `remote-harness install`',
      service: (name: string, detail: string) => `serviço em segundo plano ${name} (${detail})`,
      serviceHint: 'opcional: `remote-harness service install`',
      launcherNative: 'pedidos de acesso a pastas mostram "Remote Harness"',
      launcherScript: 'pedidos de acesso a pastas mostram "node" (sem launcher compilado)',
      launcherHint:
        'instale as Command Line Tools (`xcode-select --install`) e rode `remote-harness service install`',
      fullDiskAccess: 'Acesso Total ao Disco',
      fullDiskAccessHint:
        'para não ter um pedido por pasta, adicione "Remote Harness" em Ajustes do Sistema → Privacidade e Segurança → Acesso Total ao Disco',
      accessibility: 'Acessibilidade / Automação',
      accessibilityHint:
        'permita "Remote Harness" em Ajustes do Sistema → Privacidade e Segurança → Automação',
      keychain: 'Acesso ao Keychain',
      keychainHint: 'o armazenamento de token não conseguiu ler de volta o token que acabou de gravar',
      linger: 'lingering (o serviço continua rodando após o logout)',
      lingerHint: 'rode `loginctl enable-linger $USER`',
      keepAwake: (mode: string, state: string) => `manter acordado: ${mode} (${state})`,
      keepAwakeHeld: 'ativo agora',
      keepAwakeIdle: 'não é preciso agora',
      keepAwakeFailed: (reason: string) => `o auxiliar de energia falhou: ${reason}`,
      lidNote: 'num notebook, fechar a tampa ainda suspende, a não ser na tomada e com monitor externo',
      devices: (platforms: string) => `celulares registrados para push: ${platforms}`,
      noDevices: 'nenhum celular registrado para push',
      noDevicesHint: 'abra o app e permita as notificações',
      pushMode: (mode: string) => `push: ${mode}`,
      noRelayGrant:
        'nenhum celular tem grant do relay: use um build do app com o push relay ou salve uma conta de serviço do Firebase',
    },
    install: {
      description:
        'instala launchers, PATH no ~/.zshrc / ~/.bashrc e hooks nos perfis do config (sem perguntas)',
      openTerminal: (rc: string) =>
        `Abra um novo terminal (ou \`source ${rc}\`) e use os launchers no lugar do \`claude\`.`,
    },
    uninstall: {
      description: 'remove launchers, bloco do PATH no ~/.zshrc / ~/.bashrc e hooks instalados',
      shellRemoved: (files: string) => `bloco do PATH removido de ${files}`,
      hooksRemoved: (path: string) => `hooks removidos de ${path}`,
    },
    service: {
      description: 'daemon como serviço em segundo plano (launchd no macOS, systemd no Linux)',
      install: 'instala e inicia o serviço em segundo plano (inicia com o login e reinicia se cair)',
      loaded: (path: string) => `serviço instalado: ${path}`,
      app: (path: string) => `app: ${path}`,
      tailscaleWaiting: '⚠ Tailscale não encontrado: o daemon fica aguardando a interface 100.x',
      logs: (path: string) => `logs em ${path}`,
      uninstall: 'para e remove o serviço em segundo plano',
      removed: 'serviço removido',
      status: 'mostra se o serviço está carregado',
      notLoaded: 'não carregado',
      unavailable:
        'Serviços de usuário do systemd não estão disponíveis aqui (`systemctl --user` falhou). Rode `remote-harness start` quando quiser usar (por exemplo, numa janela do tmux).',
      lingerHint:
        'Lingering desligado: o serviço para quando você sai da sessão. Para mantê-lo rodando e iniciar no boot: `loginctl enable-linger $USER`',
      linger: (enabled: boolean) =>
        enabled
          ? 'lingering ligado (continua rodando após o logout, inicia no boot)'
          : 'lingering desligado (para no logout)',
    },
    update: {
      description:
        'atualiza para a última versão: compila, atualiza os hooks e reinicia o serviço (sem perguntas)',
      ref: 'branch ou tag a instalar (padrão: o canal de atualização)',
      older: (from: string, to: string) =>
        `Isto instala uma versão mais antiga (${from} → ${to}) porque o canal de atualização mudou.`,
      force: 'compila de novo mesmo se já estiver atualizado',
      checking: (ref: string) => `Procurando uma versão nova em ${ref}`,
      notInstaller: (dir: string) =>
        `Esta não é a cópia do instalador (${dir}). Num clone de desenvolvimento use \`git pull\` e \`pnpm --filter @remote-harness/daemon build\`.`,
      dirty: (dir: string) => `${dir} tem mudanças locais. Faça commit ou descarte e rode de novo.`,
      fetchFailed: (error: string) => `Não consegui baixar a versão nova: ${error}`,
      checkoutFailed: 'Não consegui trocar para a versão nova.',
      rolledBack: (version: string) =>
        `Voltei para a ${version} e recompilei: o computador fica como estava.`,
      rollBackFailed: 'Não consegui voltar para a versão anterior: rode `remote-harness update` de novo.',
      upToDate: (version: string, commit: string) => `Já está atualizado (${version}, ${commit}).`,
      available: (version: string, commit: string) => `Versão nova: ${version} (${commit})`,
      failed: 'A atualização falhou (veja acima). A versão anterior continua rodando até o próximo reinício.',
      serviceRestarted: 'serviço em segundo plano reiniciado',
      serviceNotInstalled:
        'serviço em segundo plano não instalado (opcional: `remote-harness service install`)',
      updated: (from: string, to: string) => `Remote Harness atualizado: ${from} → ${to}`,
      rebuilt: (version: string) => `Remote Harness ${version} compilado de novo`,
    },
    updates: {
      description: 'canal de atualização, atualizações automáticas e a verificação em segundo plano',
      status: 'mostra a versão, o canal e a última verificação',
      check: 'procura uma nova versão agora',
      channel: 'mostra ou troca o canal: main (estável) ou development',
      auto: 'liga ou desliga as atualizações automáticas',
      current: (version: string, channel: string) => `Remote Harness ${version} · canal ${channel}`,
      autoState: (on: boolean): string =>
        on ? 'atualizações automáticas ligadas' : 'atualizações automáticas desligadas',
      lastCheck: (when: string) => `última verificação: ${when}`,
      neverChecked: 'ainda não verificado',
      available: (version: string) => `nova versão disponível: ${version}`,
      older: (version: string) =>
        `o canal tem uma versão mais antiga: ${version} (\`remote-harness update\` instala)`,
      upToDate: 'atualizado',
      channelSet: (channel: string) => `canal: ${channel}`,
      invalidValue: (value: string, list: string) => `Valor desconhecido "${value}". Use um destes: ${list}.`,
      invalidChannel: (value: string, list: string) =>
        `Canal desconhecido "${value}". Use um destes: ${list}.`,
      runUpdate: 'rode `remote-harness update` para trocar agora',
      applied: 'aplicado ao daemon em execução',
      notRunning: 'o daemon não está rodando: vale na próxima vez que iniciar',
    },
    push: {
      description: 'notificações push: status, ligar ou desligar, enviar um teste',
      status: 'mostra como os pushes são enviados e para quantos celulares',
      on: 'envia pushes (conta de serviço do Firebase se existir, senão o push relay)',
      off: 'para todos os pushes e atualizações do status ao vivo',
      test: 'envia uma notificação de teste para todos os celulares registrados',
      modes: {
        firebase: (path: string) => `Firebase próprio (${path})`,
        relay: 'push relay embutido',
        off: 'desligado (config "push": "off")',
      },
      phones: (count: number) => (count === 1 ? '1 celular registrado' : `${count} celulares registrados`),
      changed: (mode: string) => `push: ${mode}`,
      applied: 'aplicado ao daemon em execução',
      notRunning: 'o daemon não está rodando: vale na próxima vez que iniciar',
      testSent: (count: number) =>
        count === 1 ? 'teste enviado para 1 celular' : `teste enviado para ${count} celulares`,
      testResult: {
        off: 'o push está desligado (`remote-harness push on`)',
        unregistered: 'nenhum celular registrado: abra o app e permita as notificações',
        failed: 'o envio falhou: veja os logs do daemon',
      },
    },
    rules: {
      description: 'regras de "permitir sempre" criadas pelo app',
      list: 'lista as regras criadas pelo app',
      empty: 'Nenhuma regra criada pelo app.',
      undo: 'remove a regra do arquivo em que foi gravada',
      notFound: (id: string) => `Regra ${id} não encontrada.`,
      removed: (rule: string, file: string) => `Regra ${rule} removida de ${file}.`,
      alreadyGone: 'A regra já não estava no arquivo.',
    },
  },
  install: {
    missingProviderKey: (id: string, provider: string) =>
      `Nenhuma chave do ${provider} guardada para o perfil ${id}: rode \`remote-harness provider key ${id}\`.`,
    shortcut: (path: string) => `atalho ${path}`,
    shellPath: (files: string) => `PATH em ${files}`,
    hooksIn: (path: string) => `hooks em ${path}`,
    codexTrust:
      'O Codex pede uma vez para confiar em hooks novos: abra o `codex` e escolha "Trust all and continue" (ou revise em /hooks). Até lá, as sessões dele ficam somente leitura.',
    launcherRemoved: (id: string) => `launcher ${id} removido`,
    hooksRemovedFrom: (path: string) => `hooks removidos de ${path}`,
    statusLineIn: (path: string) => `status line em ${path}`,
    statusLineRestored: (path: string) => `status line restaurada em ${path}`,
  },
  setup: {
    languageQuestion: 'Idioma',
    keys: {
      navigate: 'navegar',
      select: 'escolher',
      submit: 'confirmar',
      all: 'todos',
      invert: 'inverter',
    },
    yes: 'sim',
    no: 'não',
    welcome: {
      title: 'Boas-vindas ao Remote Harness!',
      intro1: (machine: string) => `Vamos preparar este ${machine} para você acompanhar e controlar`,
      intro2: 'seus agentes de código pelo celular. Leva uns 2 minutos.',
      footer: (version: string) => `v${version} · ↑/↓ para escolher · Enter para confirmar · Ctrl+C sai`,
    },
    steps: {
      accounts: 'Contas do Claude Code',
      installing: 'Instalando launchers, PATH e hooks',
      service: 'Serviço em segundo plano',
      tailscale: 'Tailscale e celular',
    },
    noAccounts:
      'Nenhuma conta do Claude Code encontrada. Rode `claude` uma vez para fazer login e depois `remote-harness setup`.',
    confirmSave: 'Gravar e instalar?',
    nothingChanged: 'Nada foi alterado.',
    serviceQuestion: (machine: string) =>
      `Iniciar o Remote Harness junto com o ${machine} (e reiniciar se cair)?`,
    noService: 'Sem serviço: rode `remote-harness start` quando quiser usar.',
    serviceUnavailable:
      '  Serviços de usuário do systemd não estão disponíveis aqui (`systemctl --user`).\n' +
      '  Rode `remote-harness start` quando quiser usar (por exemplo, numa janela do tmux ou pelo seu sistema de init).',
    lingerQuestion:
      'Manter o Remote Harness rodando depois do logout e iniciar no boot? (loginctl enable-linger)',
    lingerEnabled: 'lingering ativado (loginctl enable-linger)',
    lingerFailed:
      '  Não consegui ativar o lingering. Rode `sudo loginctl enable-linger $USER` para manter o daemon rodando após o logout.',
    lingerSkipped:
      '  Sem lingering o daemon para quando você sai da sessão. Ative depois com `loginctl enable-linger $USER`.',
    tailscaleIntro: (machine: string, install: string) =>
      `  O ${machine} e o celular conversam por uma rede privada do Tailscale (grátis), de qualquer lugar.\n` +
      `  1. No ${machine}: ${install}\n` +
      '  2. No celular: instale "Tailscale" (App Store ou Google Play) e entre com a mesma conta',
    tailscaleInstall: {
      darwin: 'instale em https://tailscale.com/download/mac (ou `brew install --cask tailscale`) e entre',
      linux: 'instale com `curl -fsSL https://tailscale.com/install.sh | sh` e rode `sudo tailscale up`',
    },
    tailscaleQuestion: (machine: string) => `Tailscale conectado no ${machine}?`,
    tailscaleRetry: 'Já conectei, verificar de novo',
    tailscaleSkip: 'Fazer isso depois',
    tailscaleNotYet: '  Ainda não encontrei a interface do Tailscale (100.x).',
    phoneHint: '  No celular: instale o app Remote Harness e o Tailscale (mesma conta) e toque em "QR code".',
    showQr: 'Mostrar o QR code de pareamento agora?',
    done: {
      installed: 'Remote Harness instalado.',
      openTerminal: (command: string) => `1. Abra um novo terminal (ou ${command})`,
      useAliases: (aliases: string, claude: string) =>
        `2. Use ${aliases} no lugar de ${claude}, com os mesmos argumentos`,
      pairIfNeeded: (command: string) => `3. Pareie com ${command} se ainda não pareou`,
      connectAndPair: (command: string) => `3. Conecte o Tailscale e rode ${command}`,
      footer: 'remote-harness doctor verifica tudo · remote-harness setup muda as contas',
    },
    accounts: {
      explain:
        '  Cada conta do Claude Code fica num diretório de configuração (CLAUDE_CONFIG_DIR).\n' +
        '  Para cada uma você escolhe um comando (alias) que a abre no tmux, pronta para o celular.',
      which: 'Quais contas você quer controlar pelo celular?',
      noneFound: (machine: string) =>
        `  Não encontrei nenhuma conta do Claude Code neste ${machine}; vamos criar uma.`,
      more: 'Mais alguma conta?',
      howToAdd: 'Como adicionar a conta?',
      noContinue: 'Não, continuar',
      create: 'Criar uma conta nova',
      createDescription:
        'Cria a pasta e abre o Claude Code nela para você fazer login (ex.: conta do trabalho)',
      existing: 'Adicionar uma pasta que já existe',
      existingDescription: 'Uma pasta usada antes com CLAUDE_CONFIG_DIR=<pasta> claude',
      folderPath: 'Caminho da pasta (ex.: ~/.claude-trabalho):',
      folderNotFound:
        'Pasta não encontrada. Para uma conta que ainda não existe, escolha "Criar uma conta nova".',
      alias: 'Comando (alias) para abrir esta conta:',
      aliasClash: (alias: string, path: string) =>
        `\`${alias}\` já existe em ${path}. O launcher terá prioridade no PATH. Usar mesmo assim?`,
      name: 'Nome exibido no app:',
      nameRequired: 'Dê um nome para reconhecer a conta no app.',
    },
    newAccount: {
      folder: 'Pasta da nova conta:',
      alreadyLoggedIn: (dir: string, login: string) => `${dir} já está logada (${login})`,
      instructions: (dir: string) =>
        `\n  Vou abrir o Claude Code usando ${dir}. Lá dentro:\n` +
        '  1. Siga a configuração inicial e entre com a conta que essa pasta vai usar (se não pedir, digite /login)\n' +
        '  2. Depois do login, digite /exit para voltar para cá\n',
      pressEnter: 'Enter para abrir o Claude Code',
      loggedIn: (dir: string, login: string) => `Logado em ${dir} (${login})`,
      claudeMissing:
        '\n  Não consegui abrir o `claude`. Instale o Claude Code: https://claude.com/claude-code',
      noLogin: '\n  Não encontrei um login nessa pasta.',
      whatNow: 'E agora?',
      retry: 'Abrir o Claude Code de novo',
      addAnyway: 'Adicionar mesmo assim (faço login depois pelo alias)',
      giveUp: 'Desistir desta conta',
    },
    provider: {
      add: (provider: string) => `Adicionar um perfil ${provider}`,
      addDescription: (provider: string) =>
        `Claude Code pelo ${provider}, pago com a sua chave do ${provider} (sem login da Anthropic)`,
      title: (provider: string) => `\n  Perfis pelo ${provider}:`,
      manage: (id: string, provider: string, key: string) => `${id} · via ${provider} · ${key}`,
      keyStored: 'chave guardada',
      keyMissing: 'sem chave guardada',
      keep: 'Manter',
      replaceKey: 'Trocar a chave',
      remove: 'Remover o perfil',
      removeDescription: 'Remove o launcher, os hooks e a chave guardada; a pasta fica',
      folder: 'Pasta do perfil (o CLAUDE_CONFIG_DIR dele):',
      model: 'Modelo padrão (opcional, ex.: anthropic/claude-sonnet-5.5; vazio = o padrão do gateway):',
      key: (provider: string) => `Chave de API do ${provider} (oculta; vazio = guardar depois):`,
      checking: (provider: string) => `Conferindo a chave com o ${provider}…`,
      accepted: 'Chave aceita',
      acceptedCredits: (left: string) => `Chave aceita · ${left} em créditos restantes`,
      rejected: (provider: string) => `O ${provider} recusou essa chave.`,
      unchecked: (provider: string, reason: string) =>
        `Não consegui conferir a chave com o ${provider} (${reason}); ela será guardada mesmo assim.`,
      whatNow: 'E agora?',
      retry: 'Digitar de novo',
      keepAnyway: 'Guardar mesmo assim',
      skip: 'Pular (guardo depois)',
      later: (id: string) => `Sem chave por enquanto. Depois: remote-harness provider key ${id}`,
      keySaved: (id: string, store: string) => `chave de ${id} guardada ${store}`,
      keyRemoved: (id: string) => `chave de ${id} removida do cofre de segredos`,
      keyFailed: (id: string, error: string) => `não consegui guardar a chave de ${id}: ${error}`,
      via: (provider: string) => `via ${provider}`,
    },
  },
  wsl: {
    windowsHint:
      'No Windows, o Remote Harness roda dentro do WSL2. No PowerShell: `irm https://remoteharness.app/install | iex`',
    detected: (distro: string) => `WSL2 (distribuição ${distro})`,
    unknownDistro: 'desconhecida',
    systemd: 'systemd rodando no WSL',
    systemdHint: 'rode `remote-harness setup` para ativá-lo ([boot] systemd=true em /etc/wsl.conf)',
    systemdPendingHint:
      'já ativado em /etc/wsl.conf: rode `wsl --shutdown` no PowerShell do Windows e abra a distribuição de novo',
    networking: (mode: string) => `rede do WSL: ${mode}`,
    networkingUnknown: 'desconhecida (%UserProfile%\\.wslconfig não encontrado)',
    tailscaleHint:
      'rode o Tailscale dentro do WSL ou use a rede espelhada com o Tailscale no Windows (`remote-harness setup` explica os dois)',
    source: {
      wsl: 'dentro do WSL',
      mirrored: 'Windows, rede espelhada',
      unknown: 'WSL',
    },
    logonTask: 'tarefa de logon do Windows "Remote Harness" (inicia o WSL no logon)',
    logonTaskHint: 'opcional: `remote-harness setup` cria a tarefa',
    logonTaskMissing:
      'sem tarefa de logon no Windows: o WSL (e o daemon) só iniciam quando você abre a distribuição',
    logonTaskRemoved: 'tarefa de logon do Windows "Remote Harness" removida',
    serviceNoSystemd:
      'O systemd não está rodando nesta distribuição do WSL, então não há serviço em segundo plano. Rode `remote-harness setup` para ativá-lo ([boot] systemd=true em /etc/wsl.conf) e depois `wsl --shutdown` no PowerShell do Windows.',
    restart:
      '  Para valer, rode `wsl --shutdown` no PowerShell do Windows, abra a distribuição de novo e rode `remote-harness setup`.',
    systemdIntro:
      '  Dentro do WSL o serviço em segundo plano precisa do systemd, que está desligado nesta distribuição.\n' +
      '  Ele é ligado por [boot] systemd=true em /etc/wsl.conf (arquivo do root, com backup antes) com:',
    systemdCommand: (command: string) => `    ${command}`,
    systemdQuestion: 'Ativar o systemd no WSL agora? (o sudo pode pedir sua senha do Linux)',
    systemdEnabled: 'systemd ativado em /etc/wsl.conf',
    systemdFailed: (error: string) =>
      `  Não deu para alterar o /etc/wsl.conf (${error}). Adicione estas linhas com \`sudo nano /etc/wsl.conf\`:\n    [boot]\n    systemd=true`,
    systemdSkipped:
      '  Sem systemd não há serviço em segundo plano: rode `remote-harness start` quando quiser usar.',
    systemdPending: '  O systemd já está ativado em /etc/wsl.conf, mas o WSL não foi reiniciado desde então.',
    logonTaskQuestion:
      'Iniciar o WSL quando você entrar no Windows, para o daemon rodar sem abrir um terminal? (Tarefa Agendada "Remote Harness")',
    logonTaskCreated: 'tarefa de logon do Windows "Remote Harness"',
    logonTaskFailed: (error: string, command: string) =>
      `  Não deu para criar a tarefa (${error}). No PowerShell (como administrador se o acesso for negado):\n    ${command}`,
    logonTaskSkipped:
      '  Sem a tarefa de logon, o WSL e o daemon iniciam quando você abre a distribuição. Crie depois com `remote-harness setup`.',
    tailscaleIntro:
      '  O computador e o celular conversam por uma rede privada do Tailscale (gratuita). Dentro do WSL há dois jeitos:\n' +
      '  A. Tailscale dentro do WSL (qualquer Windows): `curl -fsSL https://tailscale.com/install.sh | sh` e `sudo tailscale up`\n' +
      '  B. Tailscale no Windows + rede espelhada do WSL (Windows 11 22H2+): networkingMode=mirrored no .wslconfig\n' +
      '  No celular: instale o "Tailscale" (App Store ou Google Play) e entre com a mesma conta',
    tailscaleMirrored: 'O Tailscale roda no Windows: ativar a rede espelhada (.wslconfig)',
    mirroredEnabled: (path: string) => `networkingMode=mirrored em ${path}`,
    mirroredAlready: (path: string) => `networkingMode=mirrored já estava em ${path}`,
    mirroredNoConfig:
      '  Não encontrei o %UserProfile%\\.wslconfig (a interoperabilidade com o Windows está desligada?). Adicione [wsl2] networkingMode=mirrored nele à mão.',
  },
  power: {
    why: 'Há sessões do Remote Harness em execução',
  },
  bundle: {
    folderAccess:
      'O Remote Harness roda as sessões do seu agente de código nesta pasta e precisa ler e gravar os arquivos dela.',
  },
  machine: { darwin: 'Mac', linux: 'computador' },
  profiles: {
    defaultName: 'Pessoal',
    newDirName: (index: number) => (index === 0 ? 'trabalho' : index === 1 ? 'pessoal' : `conta-${index}`),
    newDirFallback: 'nova',
    claudeAccount: 'conta Claude',
    apiKey: 'chave de API',
    aliasFormat: 'Use letras minúsculas, números, - ou _, começando com uma letra (até 32).',
    aliasReserved: (alias: string) => `"${alias}" é reservado: o launcher chama o próprio \`${alias}\`.`,
    aliasTaken: (alias: string) => `"${alias}" já é usado por outro perfil.`,
    dirAbsolute: 'Use um caminho absoluto ou começando com ~/.',
    dirOtherTool: (dir: string) => `${dir} é de outra ferramenta; escolha outro nome.`,
    dirInList: 'Essa pasta já está na lista de contas.',
    dirIsFile: 'Já existe um arquivo com esse nome.',
  },
  /** Sent back to Claude Code (shown in its TUI). */
  claudeCode: {
    denied: 'Negado pelo Remote Harness',
    keepPlanning: 'O usuário quer continuar planejando. Revise o plano antes de chamar ExitPlanMode de novo.',
  },
  live: {
    states: {
      working: 'Trabalhando',
      waiting: 'Esperando você',
      done: 'Concluída',
      closed: 'Sessão encerrada',
    },
    steps: {
      thinking: 'pensando',
      writing: 'escrevendo a resposta',
      command: 'executando um comando',
      editing: 'editando arquivos',
      reading: 'lendo arquivos',
      searching: 'buscando no código',
      web: 'navegando na web',
      agent: 'rodando um subagente',
      planning: 'atualizando o plano',
      tool: 'usando uma ferramenta',
      permission: 'permissão pendente',
    },
    tools: (count: number) => (count === 1 ? '1 ferramenta' : `${count} ferramentas`),
    tasks: (count: number) => (count === 1 ? '1 tarefa rodando' : `${count} tarefas rodando`),
    ago: 'há {time}',
    allow: 'Permitir',
    deny: 'Negar',
    total: 'total',
    closedHint: 'transcrição mantida · retome pelo app',
  },
  updates: {
    available: (version: string) => `Remote Harness ${version} disponível`,
    availableBody: 'Atualize pelo ícone na barra de menus ou rode `remote-harness update`.',
    older: (version: string) => `O Remote Harness ${version} deste canal é mais antigo`,
    olderBody: 'Escolha "Instalar" no ícone da barra de menus ou rode `remote-harness update` para trocar.',
    updating: (version: string) => `Atualizando o Remote Harness para ${version}…`,
    tray: {
      tooltip: (version: string) => `Remote Harness ${version}`,
      running: (version: string) => `Rodando · ${version}`,
      updateAvailable: (version: string) => `Atualização disponível: ${version}`,
      updating: 'Atualizando…',
      check: 'Procurar atualizações',
      checking: 'Procurando…',
      updateNow: (version: string) => `Atualizar agora (${version})`,
      installOlder: (version: string) => `Instalar ${version} (mais antiga)`,
      auto: 'Atualizações automáticas',
      channel: 'Canal',
      channels: { main: 'main (estável)', development: 'development' },
      logs: 'Abrir logs',
      restart: 'Reiniciar daemon',
      doctor: 'Rodar doctor',
      quit: 'Fechar ícone',
      status: (machine: string, version: string, since: string) => `${machine} · ${version} · desde ${since}`,
      waiting: 'Esperando você',
      allow: 'Permitir',
      always: 'Sempre permitir',
      deny: 'Negar',
      focus: 'Abrir no terminal (tmux)',
      rename: 'Renomear…',
      close: 'Encerrar sessão',
      seeAllSessions: 'Ver todas as sessões…',
      sessionsWindowTitle: 'Sessões',
      searchSessions: 'Buscar sessões',
      copyPath: 'Copiar caminho',
      renamePromptTitle: 'Renomear sessão',
      renameConfirm: 'Renomear',
      cancel: 'Cancelar',
      prefsWindowTitle: 'Preferências do Remote Harness',
      tabGeneral: 'Geral',
      tabUpdates: 'Atualizações',
      tabNotifications: 'Notificações',
      tabProfiles: 'Perfis',
      tabPairing: 'Pareamento',
      tabAdvanced: 'Avançado',
      prefMachineName: 'Nome da máquina',
      prefShowInMenuBar: 'Mostrar na barra de menus',
      prefStartAtLogin: 'Abrir ao fazer login',
      prefPushHint: 'Abrange as notificações e o status ao vivo no celular',
      muteRulesHint: 'As sessões silenciadas são gerenciadas pelo app',
      updatesUnavailable: 'As atualizações estão desativadas nesta versão',
      sessions: (total: number, running: number) =>
        running > 0 ? `Sessões · ${total} · ${running} rodando` : `Sessões · ${total}`,
      noSessions: 'Sem sessões',
      ended: (count: number) => (count === 1 ? '1 sessão encerrada' : `${count} sessões encerradas`),
      states: { running: 'rodando', waiting: 'esperando', idle: 'ociosa', ended: 'encerrada' },
      worktree: 'worktree',
      phones: (count: number, push: boolean) => `Celulares · ${count}${push ? ' · push ✓' : ''}`,
      newSession: 'Nova sessão…',
      pair: 'Parear um celular…',
      docs: 'Abrir a documentação',
      prefs: 'Preferências…',
      pairMenu: 'Parear um celular',
      pairInTerminal: 'Mostrar o pareamento no terminal',
      rotateToken: 'Trocar o token…',
      rotateConfirm: 'Trocar e desconectar os celulares pareados',
      prefsMenu: 'Preferências',
      prefPermissions: 'Mostrar pedidos de permissão aqui',
      keepAwake: 'Manter o computador acordado',
      keepAwakeModes: { off: 'Nunca', sessions: 'Enquanto houver sessões ativas', always: 'Sempre' },
      prefPush: 'Notificações push',
      openConfig: 'Abrir o arquivo de configuração…',
      quitMenu: 'Sair',
      hideIcon: 'Esconder o ícone (o serviço continua rodando)',
      stopService: 'Parar o serviço até o próximo login',
    },
  },
  push: {
    sessionDone: 'Sessão concluída',
    sessionWorking: 'Sessão trabalhando',
    sessionWaiting: 'Sessão aguardando você',
    permissionPending: 'Permissão pendente',
    questionPending: 'O agente está esperando sua resposta',
    planPending: 'Plano pronto para revisão',
    questionReminder: 'Ainda esperando sua resposta',
    planReminder: 'O plano ainda espera sua revisão',
    testTitle: 'Notificação de teste',
    testBody: (host: string) => `As notificações de ${host} estão funcionando`,
  },
} satisfies Messages
