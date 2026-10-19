import enContributing from '../../content/en-US/contributing.md?raw'
import enDaemon from '../../content/en-US/daemon.md?raw'
import enGettingStarted from '../../content/en-US/getting-started.md?raw'
import enIndex from '../../content/en-US/index.md?raw'
import enPrivacy from '../../content/en-US/privacy.md?raw'
import enSecurity from '../../content/en-US/security.md?raw'
import enTroubleshooting from '../../content/en-US/troubleshooting.md?raw'
import enUsingTheApp from '../../content/en-US/using-the-app.md?raw'
import esContributing from '../../content/es-ES/contributing.md?raw'
import esDaemon from '../../content/es-ES/daemon.md?raw'
import esGettingStarted from '../../content/es-ES/getting-started.md?raw'
import esIndex from '../../content/es-ES/index.md?raw'
import esPrivacy from '../../content/es-ES/privacy.md?raw'
import esSecurity from '../../content/es-ES/security.md?raw'
import esTroubleshooting from '../../content/es-ES/troubleshooting.md?raw'
import esUsingTheApp from '../../content/es-ES/using-the-app.md?raw'
import ptContributing from '../../content/pt-BR/contributing.md?raw'
import ptDaemon from '../../content/pt-BR/daemon.md?raw'
import ptGettingStarted from '../../content/pt-BR/getting-started.md?raw'
import ptIndex from '../../content/pt-BR/index.md?raw'
import ptPrivacy from '../../content/pt-BR/privacy.md?raw'
import ptSecurity from '../../content/pt-BR/security.md?raw'
import ptTroubleshooting from '../../content/pt-BR/troubleshooting.md?raw'
import ptUsingTheApp from '../../content/pt-BR/using-the-app.md?raw'
import { LOCALE_PATHS, type Locale } from '../i18n/locale.ts'

/** Navigation order; `index` is `/docs/` itself. The same in every language. */
export const DOC_SLUGS = [
  'index',
  'getting-started',
  'using-the-app',
  'daemon',
  'security',
  'privacy',
  'troubleshooting',
  'contributing',
] as const
export type DocSlug = (typeof DOC_SLUGS)[number]

export function isDocSlug(value: string): value is DocSlug {
  return (DOC_SLUGS as readonly string[]).includes(value)
}

/** Raw Markdown per language and slug; a language may lack a page (it then falls back to en-US). */
export type DocRegistry = Record<Locale, Partial<Record<DocSlug, string>>>

export const DOCS: DocRegistry = {
  'en-US': {
    index: enIndex,
    'getting-started': enGettingStarted,
    'using-the-app': enUsingTheApp,
    daemon: enDaemon,
    security: enSecurity,
    privacy: enPrivacy,
    troubleshooting: enTroubleshooting,
    contributing: enContributing,
  },
  'pt-BR': {
    index: ptIndex,
    'getting-started': ptGettingStarted,
    'using-the-app': ptUsingTheApp,
    daemon: ptDaemon,
    security: ptSecurity,
    privacy: ptPrivacy,
    troubleshooting: ptTroubleshooting,
    contributing: ptContributing,
  },
  'es-ES': {
    index: esIndex,
    'getting-started': esGettingStarted,
    'using-the-app': esUsingTheApp,
    daemon: esDaemon,
    security: esSecurity,
    privacy: esPrivacy,
    troubleshooting: esTroubleshooting,
    contributing: esContributing,
  },
}

/** `/en/docs/` for the index, `/en/docs/<slug>/` otherwise. */
export function docPath(locale: Locale, slug: DocSlug): string {
  return `${LOCALE_PATHS[locale]}docs/${slug === 'index' ? '' : `${slug}/`}`
}

/** The language-negotiated URL of a page (`/docs/`, `/docs/<slug>/`). */
export function negotiatedDocPath(slug: DocSlug): string {
  return `/docs/${slug === 'index' ? '' : `${slug}/`}`
}
