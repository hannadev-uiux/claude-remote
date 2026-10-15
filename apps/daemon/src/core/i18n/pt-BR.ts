import type { Messages } from './en-US.ts'

export const ptBR = {
  cli: {
    description: 'Daemon do Claude Remote: controla sessões do Claude Code no tmux pelo celular',
    help: 'mostra a ajuda do comando',
    version: 'mostra a versão',
    buildMissing: 'Build não encontrado: rode `pnpm --filter @claude-remote/daemon build`.',
    unsupportedPlatform: (platform: string, supported: string) =>
      `Sistema não suportado (${platform}). O Claude Remote roda em ${supported}.`,
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
      simulatorHint:
        'Para testar no simulador deste Mac: `claude-remote start --dev` e `claude-remote pair --dev`.',
      scan: 'Escaneie com o app Claude Remote. Não compartilhe este código.',
    },
    setup: {
      description: 'assistente: escolhe contas e aliases, instala hooks, serviço e pareia o iPhone',
      yes: 'sem perguntas: mantém o config ou usa as contas encontradas',
      noService: 'não instala o serviço em segundo plano',
      lang: (codes: string) => `idioma (${codes}); pula a pergunta`,
      invalidLang: (value: string, codes: string) => `Idioma desconhecido "${value}". Use um de: ${codes}.`,
      interrupted:
        'Instalação interrompida. O que já foi mostrado como ✓ ficou feito; rode `claude-remote setup` de novo quando quiser.',
    },
    rotateToken: {
      description: 'gera um novo token e derruba as conexões existentes',
      rotated: 'Token trocado; conexões encerradas.',
      rotatedOffline: 'Token trocado (daemon não está rodando).',
      pairAgain: 'Rode `claude-remote pair` para parear de novo.',
    },
    doctor: {
      description: 'verifica dependências e configuração',
      notOnPath: 'não encontrado no PATH',
      tailscaleMissing: 'interface 100.x não encontrada',
      profile: (id: string, configDir: string) => `perfil ${id} (${configDir})`,
      dirMissing: 'diretório não existe',
      daemonRunning: 'daemon rodando',
      runStart: 'rode `claude-remote start`',
      token: (store: string) => `token ${store}`,
      tokenStores: {
        keychain: 'no Keychain do macOS',
        secretTool: 'no Secret Service (secret-tool)',
        file: (path: string) => `no arquivo ${path} (0600)`,
      },
      runPair: 'rode `claude-remote pair`',
    },
    install: {
      description: 'instala launchers, PATH no ~/.zshrc e hooks nos perfis do config (sem perguntas)',
      openTerminal: 'Abra um novo terminal (ou `source ~/.zshrc`) e use os launchers no lugar do `claude`.',
    },
    uninstall: {
      description: 'remove launchers, bloco do ~/.zshrc e hooks instalados',
      zshrcRemoved: 'bloco removido do ~/.zshrc',
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
        'Serviços de usuário do systemd não estão disponíveis aqui (`systemctl --user` falhou). Rode `claude-remote start` quando quiser usar (por exemplo, numa janela do tmux).',
      lingerHint:
        'Lingering desligado: o serviço para quando você sai da sessão. Para mantê-lo rodando e iniciar no boot: `loginctl enable-linger $USER`',
      linger: (enabled: boolean) =>
        enabled
          ? 'lingering ligado (continua rodando após o logout, inicia no boot)'
          : 'lingering desligado (para no logout)',
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
    shortcut: (path: string) => `atalho ${path}`,
    zshrcPath: 'PATH no ~/.zshrc',
    hooksIn: (path: string) => `hooks em ${path}`,
    launcherRemoved: (id: string) => `launcher ${id} removido`,
    hooksRemovedFrom: (path: string) => `hooks removidos de ${path}`,
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
      title: 'Boas-vindas ao Claude Remote!',
      intro1: 'Vamos preparar este Mac para você acompanhar e controlar',
      intro2: 'o Claude Code pelo iPhone. Leva uns 2 minutos.',
      footer: (version: string) => `v${version} · ↑/↓ para escolher · Enter para confirmar · Ctrl+C sai`,
    },
    steps: {
      accounts: 'Contas do Claude Code',
      installing: 'Instalando launchers, PATH e hooks',
      service: 'Serviço em segundo plano',
      tailscale: 'Tailscale e iPhone',
    },
    noAccounts:
      'Nenhuma conta do Claude Code encontrada. Rode `claude` uma vez para fazer login e depois `claude-remote setup`.',
    confirmSave: 'Gravar e instalar?',
    nothingChanged: 'Nada foi alterado.',
    serviceQuestion: 'Iniciar o Claude Remote junto com o Mac (e reiniciar se cair)?',
    noService: 'Sem serviço: rode `claude-remote start` quando quiser usar.',
    serviceUnavailable:
      '  Serviços de usuário do systemd não estão disponíveis aqui (`systemctl --user`).\n' +
      '  Rode `claude-remote start` quando quiser usar (por exemplo, numa janela do tmux ou pelo seu sistema de init).',
    lingerQuestion:
      'Manter o Claude Remote rodando depois do logout e iniciar no boot? (loginctl enable-linger)',
    lingerEnabled: 'lingering ativado (loginctl enable-linger)',
    lingerFailed:
      '  Não consegui ativar o lingering. Rode `sudo loginctl enable-linger $USER` para manter o daemon rodando após o logout.',
    lingerSkipped:
      '  Sem lingering o daemon para quando você sai da sessão. Ative depois com `loginctl enable-linger $USER`.',
    tailscaleIntro:
      '  O Mac e o iPhone conversam por uma rede privada do Tailscale (grátis), de qualquer lugar.\n' +
      '  1. No Mac: instale em https://tailscale.com/download/mac (ou `brew install --cask tailscale`) e entre\n' +
      '  2. No iPhone: instale "Tailscale" na App Store e entre com a mesma conta',
    tailscaleQuestion: 'Tailscale conectado no Mac?',
    tailscaleRetry: 'Já conectei, verificar de novo',
    tailscaleSkip: 'Fazer isso depois',
    tailscaleNotYet: '  Ainda não encontrei a interface do Tailscale (100.x).',
    iphoneHint: '  No iPhone: instale o app Claude Remote e o Tailscale (mesma conta) e toque em "QR code".',
    showQr: 'Mostrar o QR code de pareamento agora?',
    done: {
      installed: 'Claude Remote instalado.',
      openTerminal: (command: string) => `1. Abra um novo terminal (ou ${command})`,
      useAliases: (aliases: string, claude: string) =>
        `2. Use ${aliases} no lugar de ${claude}, com os mesmos argumentos`,
      pairIfNeeded: (command: string) => `3. Pareie com ${command} se ainda não pareou`,
      connectAndPair: (command: string) => `3. Conecte o Tailscale e rode ${command}`,
      footer: 'claude-remote doctor verifica tudo · claude-remote setup muda as contas',
    },
    accounts: {
      explain:
        '  Cada conta do Claude Code fica num diretório de configuração (CLAUDE_CONFIG_DIR).\n' +
        '  Para cada uma você escolhe um comando (alias) que a abre no tmux, pronta para o celular.',
      which: 'Quais contas você quer controlar pelo iPhone?',
      noneFound: '  Não encontrei nenhuma conta do Claude Code neste Mac; vamos criar uma.',
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
  },
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
    denied: 'Negado pelo Claude Remote',
  },
  push: {
    sessionDone: 'Sessão concluída',
    sessionWaiting: 'Sessão aguardando você',
    permissionPending: 'Permissão pendente',
  },
} satisfies Messages
