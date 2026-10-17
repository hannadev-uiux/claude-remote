import type { TFunction } from '@/core/i18n/create'

/** One-line installer of the computer side (served by maarkn.dev, redirecting to the repo's install.sh). */
export const INSTALL_URL = 'https://maarkn.dev/claude-remote/install.sh'
export const INSTALL_COMMAND = `curl -fsSL ${INSTALL_URL} | bash`
/** Tailscale in the store of the phone the guide runs on. */
export const TAILSCALE_STORES = {
  ios: { name: 'App Store', url: 'https://apps.apple.com/app/tailscale/id1470499037' },
  android: {
    name: 'Google Play',
    url: 'https://play.google.com/store/apps/details?id=com.tailscale.ipn',
  },
} as const
/** Download page that picks the right installer for macOS, Linux or Windows. */
export const TAILSCALE_DOWNLOAD_URL = 'https://tailscale.com/download'
export const REPO_URL = 'https://github.com/maarkN/remote-harness'

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
export const SETUP_STEPS = ['tailscalePhone', 'tailscaleComputer', 'install', 'pair'] as const
export type StepId = (typeof SETUP_STEPS)[number]

/**
 * First-run guide for people who installed the app before setting up the computer. `os` is
 * `Platform.OS`: Android links Tailscale on Google Play, everything else on the App Store.
 */
export function buildSetupGuide(t: TFunction, os: string): GuideStep[] {
  const store = os === 'android' ? TAILSCALE_STORES.android : TAILSCALE_STORES.ios
  const text = (id: StepId) => ({
    id,
    title: t(`setupGuide.steps.${id}.title`),
    body: t(`setupGuide.steps.${id}.body`),
  })
  return [
    {
      ...text('tailscalePhone'),
      actions: [
        {
          kind: 'link',
          label: t('setupGuide.steps.tailscalePhone.action', { store: store.name }),
          url: store.url,
        },
      ],
    },
    {
      ...text('tailscaleComputer'),
      actions: [
        {
          kind: 'share',
          label: t('setupGuide.steps.tailscaleComputer.action'),
          text: TAILSCALE_DOWNLOAD_URL,
        },
      ],
    },
    {
      ...text('install'),
      code: INSTALL_COMMAND,
      actions: [{ kind: 'share', label: t('setupGuide.steps.install.action'), text: INSTALL_COMMAND }],
    },
    { ...text('pair'), actions: [{ kind: 'scan', label: t('setupGuide.steps.pair.action') }] },
  ]
}
