import { describe, expect, test } from 'vitest'
import { route } from '../src/routes.ts'

const token = 'aB3_x-9aB3_x-9aB3_x-9aB3_x'

describe('route', () => {
  test('forwards the updates API with the query string', () => {
    expect(route('/api/updates/manifest', '?a=1')).toEqual({
      kind: 'updates',
      url: 'https://maarkn.dev/api/claude-remote/updates/manifest?a=1',
    })
    expect(route('/api/updates/assets/abc')).toMatchObject({
      url: 'https://maarkn.dev/api/claude-remote/updates/assets/abc',
    })
    expect(route('/api/updates/')).toEqual({ kind: 'not-found' })
    expect(route('/api/updates/../secret')).toEqual({ kind: 'not-found' })
  })

  test('install link: the page and the three build files under a token, at /app/ and /ios/', () => {
    for (const prefix of ['app', 'ios']) {
      expect(route(`/${prefix}/${token}/`)).toEqual({ kind: 'app-page', token })
      expect(route(`/${prefix}/${token}/index.html`)).toEqual({ kind: 'app-page', token })
      for (const name of ['manifest.plist', 'RemoteHarness.ipa', 'RemoteHarness.apk']) {
        expect(route(`/${prefix}/${token}/${name}`)).toEqual({
          kind: 'app-file',
          key: `${token}/${name}`,
          name,
        })
      }
      expect(route(`/${prefix}/${token}/builds.json`)).toEqual({ kind: 'not-found' })
      expect(route(`/${prefix}/${token}/toString`)).toEqual({ kind: 'not-found' })
    }
    expect(route(`/app/${token}`)).toEqual({ kind: 'not-found' })
    expect(route('/app/short/')).toEqual({ kind: 'not-found' })
    expect(route(`/ios/${token}/other.txt`)).toEqual({ kind: 'not-found' })
    expect(route(`/ios/${token}`)).toEqual({ kind: 'not-found' })
    expect(route('/ios/short/')).toEqual({ kind: 'not-found' })
    expect(route('/ios/')).toEqual({ kind: 'not-found' })
  })

  test('landing: negotiated at the root, fixed under the language paths', () => {
    expect(route('/')).toEqual({ kind: 'page', locale: null })
    expect(route('/index.html')).toEqual({ kind: 'page', locale: null })
    expect(route('/en/')).toEqual({ kind: 'page', locale: 'en-US' })
    expect(route('/pt-br')).toEqual({ kind: 'page', locale: 'pt-BR' })
    expect(route('/PT/')).toEqual({ kind: 'page', locale: 'pt-BR' })
    expect(route('/es/')).toEqual({ kind: 'page', locale: 'es-ES' })
    expect(route('/es/other')).toEqual({ kind: 'not-found' })
    expect(route('/fr/')).toEqual({ kind: 'not-found' })
  })

  test('docs: negotiated under /docs, fixed under the language paths; index has no segment', () => {
    expect(route('/docs')).toEqual({ kind: 'doc', locale: null, slug: 'index' })
    expect(route('/docs/')).toEqual({ kind: 'doc', locale: null, slug: 'index' })
    expect(route('/docs/getting-started')).toEqual({ kind: 'doc', locale: null, slug: 'getting-started' })
    expect(route('/docs/getting-started/')).toEqual({ kind: 'doc', locale: null, slug: 'getting-started' })
    expect(route('/pt-br/docs/')).toEqual({ kind: 'doc', locale: 'pt-BR', slug: 'index' })
    expect(route('/es/docs/daemon/')).toEqual({ kind: 'doc', locale: 'es-ES', slug: 'daemon' })
    expect(route('/en/docs/whatever/')).toEqual({ kind: 'doc', locale: 'en-US', slug: 'whatever' })
    expect(route('/docs/index/')).toEqual({ kind: 'not-found' })
    expect(route('/fr/docs/')).toEqual({ kind: 'not-found' })
    expect(route('/docs/a/b/')).toEqual({ kind: 'not-found' })
  })

  test('site files, installer redirects and the rest', () => {
    expect(route('/sitemap.xml')).toEqual({ kind: 'sitemap' })
    expect(route('/robots.txt')).toEqual({ kind: 'robots' })
    expect(route('/favicon.svg')).toEqual({ kind: 'favicon' })
    expect(route('/favicon.ico')).toEqual({ kind: 'favicon' })
    expect(route('/install.sh/x')).toEqual({ kind: 'not-found' })
    expect(route('/anything-else')).toEqual({ kind: 'not-found' })
  })

  test('installers: /install picks by client, the named scripts stay, ?ref= is checked', () => {
    expect(route('/install')).toEqual({ kind: 'install', ref: null })
    expect(route('/install/')).toEqual({ kind: 'install', ref: null })
    expect(route('/install', '?ref=development')).toEqual({ kind: 'install', ref: 'development' })
    expect(route('/install.sh')).toEqual({ kind: 'script', name: 'install.sh', ref: null })
    expect(route('/install.ps1', '?ref=v0.13.0')).toEqual({
      kind: 'script',
      name: 'install.ps1',
      ref: 'v0.13.0',
    })
    expect(route('/install', '?ref=..%2Fx')).toEqual({ kind: 'bad-ref' })
    expect(route('/install.sh', "?ref=x'y")).toEqual({ kind: 'bad-ref' })
    expect(route('/install/x')).toEqual({ kind: 'not-found' })
    expect(route('/installer')).toEqual({ kind: 'not-found' })
  })
})
