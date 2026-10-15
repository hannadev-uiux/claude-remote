import type { TFunction } from '@/core/i18n/create'

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
  id: StepId
  title: string
  body: string
  /** Shown as a copyable code block. */
  code?: string
  actions: GuideAction[]
}

/** Steps in order; texts come from `setupGuide.steps.<id>` in the catalogs. */
export const SETUP_STEPS = ['tailscaleIos', 'tailscaleMac', 'install', 'pair'] as const
export type StepId = (typeof SETUP_STEPS)[number]

/** First-run guide for people who installed the app before setting up the Mac. */
export function buildSetupGuide(t: TFunction): GuideStep[] {
  const text = (id: StepId) => ({
    id,
    title: t(`setupGuide.steps.${id}.title`),
    body: t(`setupGuide.steps.${id}.body`),
  })
  const action = (id: StepId) => t(`setupGuide.steps.${id}.action`)
  return [
    {
      ...text('tailscaleIos'),
      actions: [{ kind: 'link', label: action('tailscaleIos'), url: TAILSCALE_IOS_URL }],
    },
    {
      ...text('tailscaleMac'),
      code: 'brew install --cask tailscale',
      actions: [{ kind: 'share', label: action('tailscaleMac'), text: TAILSCALE_MAC_URL }],
    },
    {
      ...text('install'),
      code: INSTALL_COMMAND,
      actions: [{ kind: 'share', label: action('install'), text: INSTALL_COMMAND }],
    },
    { ...text('pair'), actions: [{ kind: 'scan', label: action('pair') }] },
  ]
}
