import { describe, expect, test } from 'vitest'
import { createI18n } from '@/core/i18n/create'
import { buildSetupGuide, INSTALL_COMMAND, SETUP_STEPS } from './setup-guide'

describe('setup guide', () => {
  test('installs through the HTTPS one-liner', () => {
    expect(INSTALL_COMMAND).toBe('curl -fsSL https://maarkn.dev/claude-remote/install.sh | bash')
  })

  test('walks from Tailscale to pairing, every link over HTTPS', () => {
    const guide = buildSetupGuide(createI18n('en-US').t, 'ios')
    expect(guide.map((s) => s.id)).toEqual([...SETUP_STEPS])
    expect(guide.map((s) => s.title)).toEqual([
      'Tailscale on this phone',
      'Tailscale on the computer',
      'Claude Remote on the computer',
      'Pair',
    ])
    expect(guide.at(-1)?.actions).toEqual([{ kind: 'scan', label: 'Scan the QR code' }])
    for (const step of guide) {
      for (const action of step.actions) {
        if (action.kind === 'link') expect(action.url).toMatch(/^https:\/\//)
      }
    }
  })

  test('links Tailscale in the store of the current platform', () => {
    const t = createI18n('en-US').t
    expect(buildSetupGuide(t, 'ios')[0]?.actions).toEqual([
      {
        kind: 'link',
        label: 'Open in App Store',
        url: 'https://apps.apple.com/app/tailscale/id1470499037',
      },
    ])
    expect(buildSetupGuide(t, 'android')[0]?.actions).toEqual([
      {
        kind: 'link',
        label: 'Open in Google Play',
        url: 'https://play.google.com/store/apps/details?id=com.tailscale.ipn',
      },
    ])
  })

  test('does not assume an iPhone or a Mac', () => {
    for (const locale of ['en-US', 'pt-BR', 'es-ES'] as const) {
      for (const os of ['ios', 'android']) {
        const text = JSON.stringify(buildSetupGuide(createI18n(locale).t, os))
        expect(text).not.toMatch(/iPhone|\bMac\b|AirDrop|brew/)
      }
    }
  })

  test('follows the language', () => {
    const guide = buildSetupGuide(createI18n('pt-BR').t, 'android')
    expect(guide.map((s) => s.title)).toEqual([
      'Tailscale neste celular',
      'Tailscale no computador',
      'Claude Remote no computador',
      'Parear',
    ])
    expect(guide[0]?.actions[0]).toMatchObject({ label: 'Abrir na Google Play' })
    expect(buildSetupGuide(createI18n('es-ES').t, 'ios').at(-1)?.actions).toEqual([
      { kind: 'scan', label: 'Escanear el código QR' },
    ])
  })
})
