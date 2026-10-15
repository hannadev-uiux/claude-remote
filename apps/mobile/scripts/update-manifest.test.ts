import { createHash, generateKeyPairSync, verify } from 'node:crypto'
import { describe, expect, test } from 'vitest'
import { buildManifest, contentTypeFor, signatureHeader } from './update-manifest'

const bytes = (s: string) => new TextEncoder().encode(s)

describe('buildManifest', () => {
  const { manifest, files } = buildManifest({
    id: '6f1d1c1e-6b8a-4d3c-9a57-2b4f6f8c1a10',
    createdAt: '2026-10-15T12:00:00.000Z',
    runtimeVersion: 'rt',
    channel: 'development',
    server: 'https://maarkn.dev/',
    bundle: { data: bytes('bundle') },
    assets: [
      { data: bytes('png'), ext: 'png' },
      { data: bytes('png'), ext: 'png' },
    ],
    expoClient: { name: 'Claude Remote' },
  })
  const parsed = JSON.parse(manifest)

  test('points every asset at its content-addressed URL', () => {
    const hash = createHash('sha256').update('bundle').digest('base64url')
    expect(parsed.launchAsset).toEqual({
      hash,
      key: createHash('md5').update('bundle').digest('hex'),
      contentType: 'application/javascript',
      url: `https://maarkn.dev/api/claude-remote/updates/assets/${hash}`,
    })
    expect(parsed.assets[0]).toMatchObject({ contentType: 'image/png', fileExtension: '.png' })
    expect(parsed.extra.expoClient.name).toBe('Claude Remote')
    expect(parsed.metadata).toEqual({ channel: 'development' })
  })

  test('uploads each file once', () => {
    expect(files).toHaveLength(2)
  })
})

test('contentTypeFor', () => {
  expect(contentTypeFor('TTF')).toBe('font/ttf')
  expect(contentTypeFor('bin')).toBe('application/octet-stream')
})

test('signatureHeader signs the exact manifest string', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const header = signatureHeader('{"a":1}', privateKey)
  const sig = /^sig="([^"]+)", keyid="main"$/.exec(header)?.[1] ?? ''
  expect(verify('sha256', Buffer.from('{"a":1}'), publicKey, Buffer.from(sig, 'base64'))).toBe(true)
})
