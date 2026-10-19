import { describe, expect, test } from 'vitest'
import { STORE_LIMITS, STORE_METADATA, type StoreListing } from '../store/metadata'

const LOCALES = ['en-US', 'pt-BR', 'es-ES'] as const
const SITE_PATHS = { 'en-US': '/en/', 'pt-BR': '/pt-br/', 'es-ES': '/es/' } as const

describe('store metadata', () => {
  test.each(LOCALES)('%s respects the stores’ limits and has no empty field', (locale) => {
    const listing = STORE_METADATA[locale]
    const lengths: Array<[keyof typeof STORE_LIMITS, number]> = [
      ['name', listing.name.length],
      ['subtitle', listing.subtitle.length],
      ['shortDescription', listing.shortDescription.length],
      ['description', listing.description.length],
      ['keywords', listing.keywords.join(',').length],
      ['promotionalText', listing.promotionalText.length],
      ['releaseNotes', listing.releaseNotes.length],
    ]
    for (const [field, length] of lengths) {
      expect(length, `${locale} ${field}`).toBeLessThanOrEqual(STORE_LIMITS[field])
    }
    for (const [field, value] of Object.entries(listing)) {
      expect(String(value).trim(), `${locale} ${field}`).not.toBe('')
    }
    expect(listing.keywords.length).toBeGreaterThan(0)
  })

  test('the three languages have the same shape and their own site pages', () => {
    const shape = (listing: StoreListing) => Object.keys(listing).sort()
    for (const locale of LOCALES) {
      expect(shape(STORE_METADATA[locale])).toEqual(shape(STORE_METADATA['en-US']))
      const base = `https://remoteharness.app${SITE_PATHS[locale]}`
      expect(STORE_METADATA[locale].marketingUrl).toBe(base)
      expect(STORE_METADATA[locale].supportUrl).toBe(`${base}docs/troubleshooting/`)
      expect(STORE_METADATA[locale].privacyUrl).toBe(`${base}docs/privacy/`)
    }
  })

  test('copy names the product, the install command and the trademarks, and nothing private', () => {
    for (const locale of LOCALES) {
      const text = `${STORE_METADATA[locale].description} ${STORE_METADATA[locale].promotionalText}`
      expect(text).toContain('Tailscale')
      expect(text).toContain('curl -fsSL https://remoteharness.app/install | bash')
      expect(text).toContain('Anthropic, PBC')
      expect(text).not.toMatch(/doctorx|acme|bypass/i)
    }
  })
})
