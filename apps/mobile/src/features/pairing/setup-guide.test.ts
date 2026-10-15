import { describe, expect, test } from 'vitest'
import { createI18n } from '@/core/i18n/create'
import { buildSetupGuide, INSTALL_COMMAND, SETUP_STEPS } from './setup-guide'

describe('setup guide', () => {
  test('installs through the HTTPS one-liner', () => {
    expect(INSTALL_COMMAND).toBe('curl -fsSL https://maarkn.dev/claude-remote/install.sh | bash')
  })

  test('walks from Tailscale to pairing, every link over HTTPS', () => {
    const guide = buildSetupGuide(createI18n('en-US').t)
    expect(guide.map((s) => s.id)).toEqual([...SETUP_STEPS])
    expect(guide.map((s) => s.title)).toEqual([
      'Tailscale on the iPhone',
      'Tailscale on the Mac',
      'Claude Remote on the Mac',
      'Pair',
    ])
    expect(guide.at(-1)?.actions).toEqual([{ kind: 'scan', label: 'Scan the QR code' }])
    for (const step of guide) {
      for (const action of step.actions) {
        if (action.kind === 'link') expect(action.url).toMatch(/^https:\/\//)
      }
    }
  })

  test('follows the language', () => {
    const guide = buildSetupGuide(createI18n('pt-BR').t)
    expect(guide.map((s) => s.title)).toEqual([
      'Tailscale no iPhone',
      'Tailscale no Mac',
      'Claude Remote no Mac',
      'Parear',
    ])
    expect(buildSetupGuide(createI18n('es-ES').t).at(-1)?.actions).toEqual([
      { kind: 'scan', label: 'Escanear el código QR' },
    ])
  })
})
