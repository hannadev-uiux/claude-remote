import { esc, inline } from './html.ts'
import { LOCALE_PATHS, type Locale, messagesFor } from './i18n/index.ts'
import { type InstallOs, installCommands } from './install.ts'
import { command, docsPath, pageHead, SCRIPT, siteFooter, siteHeader } from './landing.ts'

export const INSTALL_PAGE_PATH = '/install'

type Choice = { key: 'unix' | 'windows'; label: string; command: string; note: string }

/**
 * What a browser sees at `/install`: the command for its system first (`os` from the user agent),
 * the others in a collapsed list; a phone or an unknown system sees every command. `ref` is the
 * `?ref=` of the request, carried into the commands. Works without JavaScript (copy needs it).
 */
export function renderInstallPage(locale: Locale, os: InstallOs, ref: string | null = null): string {
  const m = messagesFor(locale)
  const p = m.installPage
  const commands = installCommands(ref)
  const unix: Choice = { key: 'unix', label: p.unix, command: commands.unix, note: m.install.unixNote }
  const windows: Choice = {
    key: 'windows',
    label: p.windows,
    command: commands.windows,
    note: m.install.windowsNote,
  }
  const block = (choice: Choice) =>
    `<div class="pane" data-os="${choice.key}"><h3 class="oslabel">${esc(choice.label)}</h3>${command(choice.command, m)}<p class="note">${inline(choice.note)}</p></div>`

  let body: string
  if (os === 'other') {
    body = `<p class="note phone" role="note">${esc(p.phone)}</p>${block(unix)}${block(windows)}`
  } else {
    const [first, second] = os === 'windows' ? [windows, unix] : [unix, windows]
    body = `<span class="eyebrow">${esc(p.detected)}</span>${block(first)}<details class="others"><summary>${esc(p.others)}</summary>${block(second)}</details>`
  }
  const version = ref ? `<p class="note">${inline(p.version.replace('{{ref}}', ref))}</p>` : ''
  const reqs = m.install.requirements.map((r) => `<li><span>${esc(r)}</span></li>`).join('')
  const next = inline(p.next.replace('{{docs}}', `${docsPath(locale)}getting-started/`))

  return `<!doctype html>
<html lang="${locale}">
<head>
${pageHead(locale, INSTALL_PAGE_PATH, `${p.title} · Remote Harness`, p.description, {
  pathFor: () => INSTALL_PAGE_PATH,
  xDefault: INSTALL_PAGE_PATH,
})}
</head>
<body>
<a class="skip" href="#main">${esc(m.nav.skip)}</a>
${siteHeader(locale, m, {
  pathFor: () => INSTALL_PAGE_PATH,
  nav: [
    { href: LOCALE_PATHS[locale], label: m.docs.home },
    { href: docsPath(locale), label: m.nav.docs },
  ],
})}
<main class="gutter" id="main"><div class="in installpage">
  <section class="s">
    <div class="head"><span class="eyebrow">${esc(p.eyebrow)}</span><h1>${esc(p.heading)}</h1><p>${esc(p.lead)}</p></div>
    <div class="col">
      ${version}
      ${body}
      <ul class="reqs">${reqs}</ul>
      <p class="note">${next}</p>
    </div>
  </section>
${siteFooter(locale, m)}
</div></main>
<script>${SCRIPT}</script>
</body>
</html>
`
}
