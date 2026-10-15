import { describe, expect, test } from 'vitest'
import { INSTALL_COMMAND, SETUP_GUIDE } from './setup-guide'

describe('setup guide', () => {
  test('installs through the HTTPS one-liner', () => {
    expect(INSTALL_COMMAND).toBe('curl -fsSL https://maarkn.dev/claude-remote/install.sh | bash')
  })

  test('walks from Tailscale to pairing, every link over HTTPS', () => {
    expect(SETUP_GUIDE.map((s) => s.title)).toEqual([
      'Tailscale no iPhone',
      'Tailscale no Mac',
      'Claude Remote no Mac',
      'Parear',
    ])
    expect(SETUP_GUIDE.at(-1)?.actions).toEqual([{ kind: 'scan', label: 'Escanear o QR code' }])
    for (const step of SETUP_GUIDE) {
      for (const action of step.actions) {
        if (action.kind === 'link') expect(action.url).toMatch(/^https:\/\//)
      }
    }
  })
})
