/** One-line installer of the Mac side (served by maarkn.dev, redirecting to the repo's install.sh). */
export const INSTALL_URL = 'https://maarkn.dev/claude-remote/install.sh'
export const INSTALL_COMMAND = `curl -fsSL ${INSTALL_URL} | bash`
export const TAILSCALE_IOS_URL = 'https://apps.apple.com/app/tailscale/id1470499037'
export const TAILSCALE_MAC_URL = 'https://tailscale.com/download/mac'
export const REPO_URL = 'https://github.com/maarkN/claude-remote'

export type GuideAction =
  | { kind: 'link'; label: string; url: string }
  | { kind: 'share'; label: string; text: string }
  | { kind: 'scan'; label: string }

export type GuideStep = {
  title: string
  body: string
  /** Shown as a copyable code block. */
  code?: string
  actions: GuideAction[]
}

/** First-run guide for people who installed the app before setting up the Mac. */
export const SETUP_GUIDE: readonly GuideStep[] = [
  {
    title: 'Tailscale no iPhone',
    body: 'O app fala com o seu Mac por uma rede privada do Tailscale, que funciona de qualquer lugar e é grátis para uso pessoal. Instale e entre com uma conta.',
    actions: [{ kind: 'link', label: 'Abrir na App Store', url: TAILSCALE_IOS_URL }],
  },
  {
    title: 'Tailscale no Mac',
    body: 'Instale o Tailscale no Mac e entre com a mesma conta do iPhone. Os dois aparecem como dispositivos da mesma rede.',
    code: 'brew install --cask tailscale',
    actions: [{ kind: 'share', label: 'Enviar o link para o Mac', text: TAILSCALE_MAC_URL }],
  },
  {
    title: 'Claude Remote no Mac',
    body: 'No Terminal do Mac, rode o instalador. Ele verifica os pré-requisitos, pergunta quais contas do Claude Code você quer controlar (ou cria uma nova, com login) e o comando (alias) de cada uma.',
    code: INSTALL_COMMAND,
    actions: [{ kind: 'share', label: 'Enviar o comando (AirDrop, Notas…)', text: INSTALL_COMMAND }],
  },
  {
    title: 'Parear',
    body: 'No fim, o instalador mostra um QR code (ou rode `claude-remote pair`). Escaneie com este app e pronto: abra o Claude Code no Mac pelo alias que você escolheu.',
    actions: [{ kind: 'scan', label: 'Escanear o QR code' }],
  },
]
