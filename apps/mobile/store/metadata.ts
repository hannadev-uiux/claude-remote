import type { Locale } from '@remote-harness/protocol'

/**
 * Store listing texts (App Store Connect and Google Play) in the three languages. en-US is the
 * reference shape; `scripts/store-metadata.mts` writes them in fastlane's layout and
 * `scripts/store-metadata.test.ts` enforces the stores' limits. Agent-neutral copy, product names
 * untranslated, no private project named.
 */
export type StoreListing = {
  /** App Store name and Play title. */
  name: string
  /** App Store subtitle. */
  subtitle: string
  /** Play short description. */
  shortDescription: string
  /** App Store description and Play full description. */
  description: string
  /** App Store keywords; joined with commas on output. */
  keywords: string[]
  /** App Store promotional text (editable without a new build). */
  promotionalText: string
  /** What's new, for both stores (Play allows 500 characters). */
  releaseNotes: string
  supportUrl: string
  marketingUrl: string
  privacyUrl: string
}

/** Character limits of the stores, checked by the tests. */
export const STORE_LIMITS = {
  name: 30,
  subtitle: 30,
  shortDescription: 80,
  description: 4000,
  keywords: 100,
  promotionalText: 170,
  releaseNotes: 500,
} as const

const enUS: StoreListing = {
  name: 'Remote Harness',
  subtitle: 'Coding agents from your phone',
  shortDescription: 'Follow and drive the coding agents on your computer, from your phone.',
  description: `Remote Harness lets you follow and drive Claude Code sessions that run in tmux on your own computer, from your phone, over your Tailscale network. Self-hosted: no account, no cloud relay reading your sessions.

WHAT YOU CAN DO
• See every session of every profile in one list, with the ones waiting for you on top.
• Read the conversation as it happens: Markdown, thinking, tool calls, diffs, images.
• Answer permission requests: allow, deny or always allow, with the rule written by the agent itself.
• Send the next prompt, queue follow-ups, attach photos, dictate on-device.
• Start new sessions in any folder (optionally in a git worktree), resume and close them.
• Open the raw terminal with a key bar for Esc, Ctrl+C, arrows and Tab.
• Follow subagents, the model, the context window and your usage limits.
• Live status on the lock screen (iOS) or a silent notification (Android), never with the text.
• Route a profile through OpenRouter and pick the model from the phone.

HOW IT WORKS
A small daemon on your macOS, Linux or Windows (WSL2) computer bridges the agent's own hooks and tmux to the phone over a WebSocket bound to the Tailscale interface. One command installs it: curl -fsSL https://remoteharness.app/install.sh | bash. Scan the QR code it shows, and you are paired.

PRIVACY
Everything stays on your devices and your tailnet. Push notifications carry a title, a profile and a session id, never the content. No analytics, no telemetry. The code is open source (MIT) at github.com/maarkN/remote-harness; the documentation lives at remoteharness.app/docs.

REQUIREMENTS
Tailscale on the phone and on the computer; Claude Code, tmux, git and ripgrep on the computer (the installer adds what is missing).

Remote Harness is an independent project, not affiliated with Anthropic. "Claude" and "Claude Code" are trademarks of Anthropic, PBC.`,
  keywords: [
    'claude code',
    'coding agent',
    'tmux',
    'tailscale',
    'remote',
    'terminal',
    'ai agent',
    'developer',
    'ssh',
    'permissions',
  ],
  promotionalText:
    'Answer your coding agent’s permission requests, send the next prompt and start sessions from anywhere, over your own Tailscale network.',
  releaseNotes:
    'New identity and redesigned app: themes, session list, conversation, new session, settings and iPad layout. OpenRouter profiles with a model picker. Documentation at remoteharness.app/docs.',
  supportUrl: 'https://remoteharness.app/en/docs/troubleshooting/',
  marketingUrl: 'https://remoteharness.app/en/',
  privacyUrl: 'https://remoteharness.app/en/docs/privacy/',
}

const ptBR: StoreListing = {
  name: 'Remote Harness',
  subtitle: 'Agentes de código no celular',
  shortDescription: 'Acompanhe e comande os agentes de código do seu computador, pelo celular.',
  description: `O Remote Harness permite acompanhar e comandar, pelo celular, sessões do Claude Code que rodam no tmux do seu próprio computador, pela sua rede Tailscale. Self-hosted: sem conta, sem relay na nuvem lendo as suas sessões.

O QUE DÁ PARA FAZER
• Ver todas as sessões de todos os perfis numa lista só, com as que esperam por você no topo.
• Ler a conversa enquanto acontece: Markdown, raciocínio, chamadas de ferramenta, diffs, imagens.
• Responder aos pedidos de permissão: permitir, negar ou permitir sempre, com a regra gravada pelo próprio agente.
• Mandar o próximo prompt, enfileirar os seguintes, anexar fotos, ditar no aparelho.
• Abrir sessões novas em qualquer pasta (opcionalmente num worktree git), retomar e encerrar.
• Abrir o terminal bruto com uma barra de teclas para Esc, Ctrl+C, setas e Tab.
• Acompanhar subagentes, o modelo, a janela de contexto e os seus limites de uso.
• Status ao vivo na tela de bloqueio (iOS) ou uma notificação silenciosa (Android), nunca com o texto.
• Rotear um perfil pelo OpenRouter e escolher o modelo pelo celular.

COMO FUNCIONA
Um daemon pequeno no seu computador macOS, Linux ou Windows (WSL2) faz a ponte entre os hooks do próprio agente, o tmux e o celular, por um WebSocket preso à interface do Tailscale. Um comando instala: curl -fsSL https://remoteharness.app/install.sh | bash. Escaneie o QR code que ele mostra e está pareado.

PRIVACIDADE
Tudo fica nos seus aparelhos e na sua tailnet. As notificações push levam um título, um perfil e um id de sessão, nunca o conteúdo. Sem analytics, sem telemetria. O código é aberto (MIT) em github.com/maarkN/remote-harness; a documentação está em remoteharness.app/docs.

REQUISITOS
Tailscale no celular e no computador; Claude Code, tmux, git e ripgrep no computador (o instalador adiciona o que falta).

O Remote Harness é um projeto independente, sem afiliação com a Anthropic. "Claude" e "Claude Code" são marcas da Anthropic, PBC.`,
  keywords: [
    'claude code',
    'agente de código',
    'tmux',
    'tailscale',
    'remoto',
    'terminal',
    'agente ia',
    'desenvolvedor',
    'ssh',
    'permissões',
  ],
  promotionalText:
    'Responda aos pedidos de permissão do seu agente de código, mande o próximo prompt e abra sessões de onde estiver, pela sua rede Tailscale.',
  releaseNotes:
    'Nova identidade e app redesenhado: temas, lista de sessões, conversa, nova sessão, ajustes e layout de iPad. Perfis do OpenRouter com seletor de modelo. Documentação em remoteharness.app/docs.',
  supportUrl: 'https://remoteharness.app/pt-br/docs/troubleshooting/',
  marketingUrl: 'https://remoteharness.app/pt-br/',
  privacyUrl: 'https://remoteharness.app/pt-br/docs/privacy/',
}

const esES: StoreListing = {
  name: 'Remote Harness',
  subtitle: 'Agentes de código en el móvil',
  shortDescription: 'Sigue y dirige los agentes de código de tu ordenador desde el móvil.',
  description: `Remote Harness te permite seguir y dirigir desde el móvil sesiones de Claude Code que se ejecutan en tmux en tu propio ordenador, a través de tu red Tailscale. Autoalojado: sin cuenta, sin relay en la nube leyendo tus sesiones.

QUÉ PUEDES HACER
• Ver todas las sesiones de todos los perfiles en una sola lista, con las que te esperan arriba.
• Leer la conversación según ocurre: Markdown, razonamiento, llamadas a herramientas, diffs, imágenes.
• Responder a las peticiones de permiso: permitir, denegar o permitir siempre, con la regla escrita por el propio agente.
• Enviar el siguiente prompt, encolar los siguientes, adjuntar fotos, dictar en el dispositivo.
• Abrir sesiones nuevas en cualquier carpeta (opcionalmente en un worktree de git), reanudarlas y cerrarlas.
• Abrir el terminal en bruto con una barra de teclas para Esc, Ctrl+C, flechas y Tab.
• Seguir subagentes, el modelo, la ventana de contexto y tus límites de uso.
• Estado en vivo en la pantalla de bloqueo (iOS) o una notificación silenciosa (Android), nunca con el texto.
• Enrutar un perfil por OpenRouter y elegir el modelo desde el móvil.

CÓMO FUNCIONA
Un pequeño daemon en tu ordenador macOS, Linux o Windows (WSL2) hace de puente entre los hooks del propio agente, tmux y el móvil, por un WebSocket atado a la interfaz de Tailscale. Un comando lo instala: curl -fsSL https://remoteharness.app/install.sh | bash. Escanea el código QR que muestra y ya estás emparejado.

PRIVACIDAD
Todo se queda en tus dispositivos y en tu tailnet. Las notificaciones push llevan un título, un perfil y un id de sesión, nunca el contenido. Sin analítica, sin telemetría. El código es abierto (MIT) en github.com/maarkN/remote-harness; la documentación está en remoteharness.app/docs.

REQUISITOS
Tailscale en el móvil y en el ordenador; Claude Code, tmux, git y ripgrep en el ordenador (el instalador añade lo que falte).

Remote Harness es un proyecto independiente, sin afiliación con Anthropic. "Claude" y "Claude Code" son marcas de Anthropic, PBC.`,
  keywords: [
    'claude code',
    'agente de código',
    'tmux',
    'tailscale',
    'remoto',
    'terminal',
    'agente ia',
    'desarrollador',
    'ssh',
    'permisos',
  ],
  promotionalText:
    'Responde a las peticiones de permiso de tu agente de código, envía el siguiente prompt y abre sesiones desde cualquier lugar, por tu red Tailscale.',
  releaseNotes:
    'Nueva identidad y app rediseñada: temas, lista de sesiones, conversación, nueva sesión, ajustes y diseño para iPad. Perfiles de OpenRouter con selector de modelo. Documentación en remoteharness.app/docs.',
  supportUrl: 'https://remoteharness.app/es/docs/troubleshooting/',
  marketingUrl: 'https://remoteharness.app/es/',
  privacyUrl: 'https://remoteharness.app/es/docs/privacy/',
}

export const STORE_METADATA: Record<Locale, StoreListing> = { 'en-US': enUS, 'pt-BR': ptBR, 'es-ES': esES }
