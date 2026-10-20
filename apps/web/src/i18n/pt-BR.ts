import type { WebMessages } from './en-US.ts'

export const ptBR: WebMessages = {
  meta: {
    title: 'Remote Harness: acompanhe e comande seus agentes de código pelo celular',
    description:
      'Self-hosted: o Claude Code roda no tmux da sua própria máquina e o Remote Harness transmite a conversa para o seu celular pela sua rede Tailscale. Permissões, prompts e novas sessões de onde você estiver.',
  },
  nav: {
    skip: 'Ir para o conteúdo',
    how: 'Como funciona',
    features: 'Recursos',
    security: 'Segurança',
    install: 'Instalar',
    docs: 'Docs',
    github: 'GitHub',
    language: 'Idioma',
    menu: 'Menu',
  },
  hero: {
    eyebrow: 'Self-hosted · Tailscale · tmux',
    title: 'Acompanhe e comande seus agentes de código pelo celular.',
    lead: 'O Claude Code roda no tmux da sua própria máquina. O Remote Harness transmite a conversa para o seu celular pela sua rede Tailscale: você lê o que o agente fez, responde aos pedidos de permissão, manda o próximo prompt e abre novas sessões, de onde estiver.',
    install: 'Instalar na máquina',
    app: 'Baixar o app',
    platforms: 'macOS · Linux · Windows (WSL2)',
    phones: 'iOS · Android',
    terms: 'MIT, sem conta, sem relay na nuvem',
    mockLabel: 'A lista de sessões no app, com um pedido de permissão esperando',
  },
  mock: {
    title: 'Sessões',
    host: 'MacBook Pro',
    count: '· 5 sessões',
    filters: ['todas', 'Pessoal', 'Trabalho'],
    waiting: 'Esperando você · 1',
    timer: '0:52',
    permission: {
      title: 'Adicionar rate limit no login',
      tool: 'Bash',
      command: 'gh pr create --fill --base main',
    },
    deny: 'Negar',
    always: 'Sempre',
    allow: 'Permitir',
    states: { running: 'rodando', waiting: 'esperando', idle: 'parada', ended: 'encerrada' },
    profiles: { personal: 'Pessoal', work: 'Trabalho' },
    sessions: [
      {
        title: 'Migrar a landing para Tailwind 4',
        folder: '~/projects/landing',
        branch: 'main',
        state: 'running',
        profile: 'personal',
        ago: '2 min',
      },
      {
        title: 'Adicionar rate limit no login',
        folder: '~/projects/acme-api',
        branch: 'feat/rate-limit',
        state: 'waiting',
        profile: 'work',
        ago: '4 min',
      },
      {
        title: 'Corrigir crash no onboarding',
        folder: '~/projects/acme-mobile',
        branch: 'fix/onboarding',
        state: 'idle',
        profile: 'work',
        ago: '12 min',
      },
      {
        title: 'Escrever post sobre tmux + agentes',
        folder: '~/projects/blog',
        branch: 'main',
        state: 'idle',
        profile: 'personal',
        ago: '40 min',
      },
      {
        title: 'Revisar pipeline de deploy',
        folder: '~/projects/acme-infra',
        branch: null,
        state: 'ended',
        profile: 'work',
        ago: '2 h',
      },
    ],
  },
  agents: {
    label: 'Funciona com',
    claude: 'Claude Code',
    openrouter: 'Modelos do OpenRouter',
    openrouterNote: 'via perfis',
    codex: 'Codex CLI',
    kimi: 'Kimi',
    qwen: 'Qwen Code',
    soon: 'em breve',
  },
  how: {
    eyebrow: 'Como funciona',
    title: 'Seu celular, sua máquina, sua rede. Nada no meio.',
    lead: 'As sessões rodam dentro do tmux. O agente conta o que acontece pelos seus hooks nativos, um daemon pequeno na máquina faz a ponte com o celular, e o Tailscale mantém tudo privado.',
    phone: {
      title: 'Seu celular',
      body: 'App nativo para iOS e Android. Lê a conversa, responde permissões, manda prompts, teclas, fotos e voz. Push e status ao vivo, sem conteúdo dentro.',
    },
    link1: { top: 'WebSocket pelo Tailscale', bottom: 'pareado por token · só os seus aparelhos' },
    machine: {
      title: 'Sua máquina',
      body: 'O daemon `remote-harness`: acompanha os transcripts, controla o tmux, recebe os hooks do agente em 127.0.0.1. Uma linha para instalar, um item de login ou unidade systemd para manter rodando.',
    },
    link2: { top: 'hooks + tmux', bottom: 'send-keys · capture-pane' },
    agents: {
      title: 'Seus agentes, no tmux',
      body: 'Uma janela por sessão, um alias por perfil.',
      aliases: ['pessoal → ~/.claude', 'trabalho → ~/.claude-work', 'openrouter → ~/.claude-openrouter'],
    },
    steps: [
      {
        title: 'Instale na máquina',
        body: 'Um comando. Ele confere tmux, git, ripgrep e Node, encontra seus perfis e instala os atalhos.',
      },
      {
        title: 'Escaneie o QR code',
        body: 'A instalação mostra no fim (ou `remote-harness pair`). Os dois aparelhos na mesma tailnet, pronto.',
      },
      {
        title: 'Rode o seu alias',
        body: '`trabalho` abre o Claude Code no tmux com aquele perfil. A sessão aparece no celular, totalmente controlável.',
      },
    ],
  },
  features: {
    eyebrow: 'Recursos',
    title: 'Tudo o que o terminal mostra, e as partes que o terminal não consegue.',
    items: [
      {
        glyph: '≡',
        title: 'Uma lista, todos os perfis',
        body: 'Sessões de todos os seus perfis, ordenadas pelo que se mexeu por último, com uma faixa “esperando você” no topo.',
      },
      {
        glyph: '●',
        title: 'Conversa ao vivo',
        body: 'Markdown, raciocínio, chamadas de ferramenta, diffs e resultados, transmitidos na hora e paginados até o começo.',
      },
      {
        glyph: '⛨',
        title: 'Permissões no bolso',
        body: 'Permitir, negar ou permitir sempre. O “sempre” vira uma regra escrita pelo próprio agente, desfazível pela CLI.',
      },
      {
        glyph: '⏎',
        title: 'Fila ou enviar agora',
        body: 'Enfileire os próximos pedidos enquanto o agente trabalha; eles entram em ordem quando o turno termina. Segure para enviar na hora.',
      },
      {
        glyph: '▣',
        title: 'Terminal bruto',
        body: 'O próprio painel do tmux, para menus e tudo o que a visão estruturada não cobre, com uma barra de teclas para Esc, Ctrl+C, setas e Tab.',
      },
      {
        glyph: '⎇',
        title: 'Abrir, retomar, encerrar',
        body: 'Novas sessões em qualquer pasta, opcionalmente num worktree git próprio. Retome as somente leitura. Encerre com limpeza do worktree que nunca descarta trabalho em silêncio.',
      },
      {
        glyph: '◔',
        title: 'Status ao vivo',
        body: 'Tela de bloqueio e Dynamic Island no iOS, uma notificação silenciosa no Android: estado, tipo de passo e tempo decorrido, nunca o texto.',
      },
      {
        glyph: '⌥',
        title: 'Subagentes, voz, fotos',
        body: 'Acompanhe subagentes e tarefas em segundo plano, dite prompts no aparelho, anexe fotos. Autocompletar para @arquivos e /comandos.',
      },
    ],
  },
  security: {
    eyebrow: 'Privacidade e segurança',
    title: 'O daemon é um shell remoto, então vem trancado por padrão.',
    items: [
      {
        title: 'Só no Tailscale',
        body: 'O WebSocket escuta na interface do Tailscale e em mais nada. Nenhuma porta na internet, nenhum servidor de relay lendo suas sessões.',
      },
      {
        title: 'Pareamento por token',
        body: 'Toda conexão apresenta um token guardado no Keychain (macOS), no Secret Service (Linux) ou no SecureStore (celular). Troque quando quiser.',
      },
      {
        title: 'Push sem conteúdo',
        body: 'As notificações levam um título, um perfil e um id de sessão. O status ao vivo acrescenta o nome e a pasta da sessão, nada da conversa.',
      },
      {
        title: 'Sem bypass',
        body: 'O app nunca oferece o modo “bypass permissions” do agente. Edições nos seus dotfiles são mescladas, com backup e totalmente reversíveis.',
      },
      {
        title: 'Só se você quiser',
        body: 'Nada é enviado a lugar nenhum sem a sua escolha: push pelo seu próprio projeto Firebase ou pelo relay sem conteúdo, relatórios de erro e dados de desempenho, sempre sem conteúdo das sessões.',
      },
      {
        title: 'Código aberto',
        body: 'Licença MIT, construído às claras com OpenSpec. Leia o [SECURITY.md](https://github.com/maarkN/remote-harness/blob/main/SECURITY.md) para relatar um problema.',
      },
    ],
  },
  install: {
    eyebrow: 'Instalar',
    title: 'Uma linha na máquina, um escaneio no celular.',
    tabUnix: 'macOS · Linux',
    tabWindows: 'Windows (WSL2)',
    copy: 'Copiar',
    copied: 'Copiado',
    copyLabel: 'Copiar o comando de instalação',
    unixNote:
      'Confere o sistema, instala o que falta (Homebrew, apt, dnf, pacman ou zypper), compila o daemon e abre a instalação guiada.',
    windowsNote:
      'No PowerShell. Configura o WSL2 com Ubuntu quando falta (reinicie se pedir e rode de novo) e então executa o instalador Linux dentro dele.',
    requirements: ['Node 24+ (incluído se faltar)', 'tmux', 'git', 'ripgrep', 'Tailscale', 'claude no PATH'],
    appTitle: 'Baixar o app',
    ios: { title: 'iPhone e iPad', detail: 'Compile do código por enquanto · TestFlight em breve · iOS 17+' },
    android: { title: 'Android', detail: 'APK nos Releases do GitHub · Android 10+' },
    appNote:
      'Os dois precisam do Tailscale no celular também. Instalou o app primeiro? A tela de pareamento guia a instalação na máquina.',
  },
  faq: {
    eyebrow: 'Docs e FAQ',
    title: 'As primeiras perguntas',
    lead: 'O guia completo está na [documentação](/pt-br/docs/): primeiros passos, uso do app, a CLI do daemon, segurança, solução de problemas.',
    items: [
      {
        q: 'Funciona fora de casa?',
        a: 'Sim. O Tailscale conecta seu celular e sua máquina onde estiverem, sem abrir portas. A máquina precisa estar acordada; a página Solução de problemas das docs cobre as opções de suspensão e bloqueio.',
      },
      {
        q: 'Quais agentes são suportados?',
        a: 'Claude Code hoje, com todos os perfis (`CLAUDE_CONFIG_DIR`) numa lista só, inclusive perfis roteados pelo OpenRouter. Codex CLI, Kimi e Qwen Code estão no roadmap.',
      },
      {
        q: 'Ele roda meu agente sem supervisão?',
        a: 'Só até onde os modos de permissão do próprio agente permitem. O app oferece padrão, aceitar edições, plano e auto; nunca oferece bypass. Toda permissão continua passando por você, no celular ou na máquina.',
      },
      {
        q: 'E as sessões abertas fora do tmux?',
        a: 'Continuam aparecendo, somente leitura. Retome uma pelo celular e ela reabre dentro do tmux, totalmente controlável.',
      },
      {
        q: 'Existe algum componente na nuvem?',
        a: 'Não. O push opcional passa pelo FCM (seu projeto Firebase ou o relay sem conteúdo). Todo o resto fica na sua tailnet.',
      },
      {
        q: 'O daemon precisa de um Mac?',
        a: 'Não: macOS, Linux (systemd) e Windows via WSL2 são suportados. O app roda em iOS e Android.',
      },
    ],
  },
  footer: {
    docs: 'Docs',
    github: 'GitHub',
    releases: 'Releases',
    security: 'Segurança',
    privacy: 'Privacidade',
    license: 'MIT',
    legal:
      'Remote Harness é um projeto independente, sem afiliação, endosso ou patrocínio da Anthropic, OpenAI, Moonshot AI, Alibaba Cloud ou OpenRouter. “Claude” e “Claude Code” são marcas da Anthropic, PBC; “Codex” é marca da OpenAI; Kimi, Qwen e OpenRouter e seus logos pertencem aos respectivos donos. As capturas mostram sessões de demonstração.',
    contributors: 'Contribuidores',
    madeBy: 'Feito por',
  },
  docs: {
    title: 'Documentação',
    home: 'Início',
    pages: 'Páginas',
    search: 'Buscar na documentação',
    noResults: 'Nenhum resultado',
    onThisPage: 'Nesta página',
    previous: 'Anterior',
    next: 'Próxima',
    applies: 'Vale para {{version}}',
    fallback: 'Esta página ainda não foi traduzida; aqui está a versão em inglês.',
  },
  installPage: {
    title: 'Instalar o Remote Harness',
    description:
      'Um comando instala o Remote Harness no macOS, Linux ou Windows (WSL2): confere o sistema, compila o daemon e abre o setup guiado.',
    eyebrow: 'Instalar',
    heading: 'Uma linha no terminal do seu computador.',
    lead: 'O mesmo endereço serve para todos: curl e wget recebem o script de macOS · Linux, o PowerShell recebe o do Windows e o navegador recebe esta página.',
    unix: 'macOS · Linux · WSL',
    windows: 'Windows (PowerShell)',
    detected: 'Para o seu sistema',
    others: 'Outros sistemas',
    phone: 'Rode no terminal do computador em que o seu agente de código roda, não no celular.',
    version: 'Instalando `{{ref}}` em vez da última versão.',
    next: 'Passo a passo, com o que fazer depois do setup: [primeiros passos]({{docs}}).',
  },
  appLink: {
    title: 'Instalar o app',
    lead: 'O Remote Harness para o seu celular, compilado e publicado do seu computador.',
    version: 'Versão {{version}} ({{build}}) · {{date}}',
    notPublished: 'Ainda não publicado.',
    size: '{{size}} MB',
    ios: {
      title: 'iPhone e iPad',
      install: 'Instalar',
      registered:
        'Só iPhones e iPads cadastrados no time de desenvolvedor instalam este build. Abra esta página no Safari.',
      developerMode:
        'Na primeira vez, o iOS pede para ligar o Modo de Desenvolvedor: Ajustes → Privacidade e Segurança → Modo de Desenvolvedor, e reiniciar.',
    },
    android: {
      title: 'Android',
      download: 'Baixar o APK',
      unknownApps:
        'O navegador pede para permitir a instalação de apps desconhecidos (Configurações → Apps → Acesso especial → Instalar apps desconhecidos). Depois abra o arquivo baixado.',
      updates: 'Um APK mais novo instala por cima do anterior e mantém o pareamento.',
    },
    qr: 'Aponte a câmera do celular para abrir esta página nele.',
    qrLabel: 'QR code desta página',
    showAll: 'Não é o seu aparelho? Mostrar todas as opções',
    private: 'Link privado: quem tiver o link baixa estes builds. Não publique em lugar aberto.',
  },
  notFound: {
    title: 'Página não encontrada',
    body: 'Não há nada neste endereço. A página inicial explica o app; o repositório tem o código e a documentação.',
    home: 'Voltar à página inicial',
    github: 'Abrir o repositório',
  },
}
