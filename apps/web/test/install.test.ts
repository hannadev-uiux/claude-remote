import { describe, expect, test } from 'vitest'
import installPs1 from '../../../install.ps1?raw'
import installSh from '../../../install.sh?raw'
import { CATALOGS, WEB_LOCALES } from '../src/i18n/index.ts'
import {
  classifyInstallClient,
  INSTALL_COMMANDS,
  installCommands,
  installOs,
  installScript,
  parseRef,
  scriptFor,
} from '../src/install.ts'
import { renderInstallPage } from '../src/install-page.ts'

const UA = {
  curl: 'curl/8.7.1',
  wget: 'Wget/1.21.4',
  ps5: 'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.22621.4391',
  ps7: 'Mozilla/5.0 (Windows NT 10.0; Microsoft Windows 10.0.22631; en-US) PowerShell/7.4.6',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  safariMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0',
  chromeOs:
    'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  android:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
}

describe('classifyInstallClient', () => {
  test('curl, wget and unknown clients get the shell script', () => {
    expect(classifyInstallClient(UA.curl)).toBe('shell')
    expect(classifyInstallClient(UA.wget)).toBe('shell')
    expect(classifyInstallClient(null)).toBe('shell')
    expect(classifyInstallClient('')).toBe('shell')
    expect(classifyInstallClient('HTTPie/3.2.2', '*/*')).toBe('shell')
    expect(scriptFor('shell')).toBe('install.sh')
  })

  test('PowerShell 5.1 and 7 get the PowerShell script, although they look like Mozilla', () => {
    expect(classifyInstallClient(UA.ps5)).toBe('powershell')
    expect(classifyInstallClient(UA.ps7)).toBe('powershell')
    expect(scriptFor('powershell')).toBe('install.ps1')
  })

  test('browsers get the page, also a client that asks for HTML', () => {
    for (const ua of [UA.edge, UA.safariMac, UA.firefoxLinux, UA.iphone, UA.android]) {
      expect(classifyInstallClient(ua, 'text/html,application/xhtml+xml')).toBe('browser')
    }
    expect(classifyInstallClient('SomeBot/1.0', 'text/html')).toBe('browser')
  })
})

describe('installOs', () => {
  test('desktop systems, phones and the unknown', () => {
    expect(installOs(UA.edge)).toBe('windows')
    expect(installOs(UA.safariMac)).toBe('macos')
    expect(installOs(UA.firefoxLinux)).toBe('linux')
    expect(installOs(UA.chromeOs)).toBe('linux')
    expect(installOs(UA.iphone)).toBe('other')
    expect(installOs(UA.android)).toBe('other')
    expect(installOs(null)).toBe('other')
  })
})

describe('parseRef', () => {
  test('branches and tags pass; anything else is refused', () => {
    expect(parseRef('')).toBeNull()
    expect(parseRef('?ref=')).toBeNull()
    expect(parseRef('?ref=development')).toBe('development')
    expect(parseRef('?ref=v0.13.0-ALPHA')).toBe('v0.13.0-ALPHA')
    expect(parseRef('?ref=feat/131-install')).toBe('feat/131-install')
    for (const bad of [
      '../x',
      'a..b',
      '-x',
      '/x',
      'x/',
      "x'y",
      'x$(id)',
      'x y',
      'x;y',
      'x.lock',
      'a'.repeat(101),
    ]) {
      expect(parseRef(`?ref=${encodeURIComponent(bad)}`), bad).toBe(false)
    }
  })
})

describe('installScript', () => {
  test('without a ref the bundled script is served as is', () => {
    expect(installScript('install.sh', installSh, null)).toBe(installSh)
    expect(installScript('install.ps1', installPs1, null)).toBe(installPs1)
  })

  test('install.sh: the ref becomes the default after the environment variables', () => {
    const text = installScript('install.sh', installSh, 'development')
    // biome-ignore lint/suspicious/noTemplateCurlyInString: bash parameter expansion, not a template
    expect(text).toContain('REF="${REMOTE_HARNESS_REF:-${CLAUDE_REMOTE_REF:-development}}"')
    expect(text).not.toContain('CLAUDE_REMOTE_REF:-main}}')
    expect(text.split('\n').length).toBe(installSh.split('\n').length)
  })

  test('install.ps1: the ref becomes $DefaultRef, used only without -Ref and the environment', () => {
    const text = installScript('install.ps1', installPs1, 'v0.13.0')
    expect(text).toContain("  $DefaultRef = 'v0.13.0'")
    expect(installPs1).toContain("if ($Ref -eq '') { $Ref = $DefaultRef }")
  })

  test('a script without the anchor line fails loudly instead of ignoring the ref', () => {
    expect(() => installScript('install.sh', '#!/bin/bash\n', 'x')).toThrow(/default ref/)
  })

  test('the installers name the single URL only', () => {
    for (const text of [installSh, installPs1]) {
      expect(text).toContain('https://remoteharness.app/install')
      expect(text).not.toMatch(/remoteharness\.app\/install\.(sh|ps1)|raw\.githubusercontent\.com/)
    }
  })
})

describe('installCommands', () => {
  test('the one-liners, quoted when they carry a ref', () => {
    expect(INSTALL_COMMANDS).toEqual({
      unix: 'curl -fsSL https://remoteharness.app/install | bash',
      windows: 'irm https://remoteharness.app/install | iex',
    })
    expect(installCommands(null)).toBe(INSTALL_COMMANDS)
    expect(installCommands('development')).toEqual({
      unix: 'curl -fsSL "https://remoteharness.app/install?ref=development" | bash',
      windows: 'irm "https://remoteharness.app/install?ref=development" | iex',
    })
  })
})

describe('renderInstallPage', () => {
  test.each(WEB_LOCALES)('%s: the detected command first, the other collapsed', (locale) => {
    const p = CATALOGS[locale].installPage
    const windows = renderInstallPage(locale, 'windows')
    expect(windows).toContain(`<html lang="${locale}">`)
    expect(windows).toContain(p.heading)
    expect(windows.indexOf(INSTALL_COMMANDS.windows)).toBeLessThan(
      windows.indexOf('<details class="others">'),
    )
    expect(windows.indexOf(INSTALL_COMMANDS.unix)).toBeGreaterThan(
      windows.indexOf('<details class="others">'),
    )
    const mac = renderInstallPage(locale, 'macos')
    expect(mac.indexOf(INSTALL_COMMANDS.unix)).toBeLessThan(mac.indexOf('<details class="others">'))
    expect(mac).not.toContain(p.phone)
    expect(windows).not.toMatch(/undefined|\[object Object\]|\{\{/)
  })

  test('a phone sees every command and the note to run it on the computer', () => {
    const html = renderInstallPage('pt-BR', 'other')
    expect(html).toContain(CATALOGS['pt-BR'].installPage.phone)
    expect(html).toContain(`data-copy="${INSTALL_COMMANDS.unix}"`)
    expect(html).toContain(`data-copy="${INSTALL_COMMANDS.windows}"`)
    expect(html).not.toContain('<details class="others">')
  })

  test('a ref is carried into the commands and said on the page', () => {
    const html = renderInstallPage('en-US', 'linux', 'development')
    expect(html).toContain('Installing <code>development</code>')
    expect(html).toContain(
      'data-copy="curl -fsSL &quot;https://remoteharness.app/install?ref=development&quot; | bash"',
    )
  })
})
