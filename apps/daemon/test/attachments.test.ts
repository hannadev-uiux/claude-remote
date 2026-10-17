import { readdir, stat, utimes, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { silentLogger } from '../src/core/logger.ts'
import { paths } from '../src/core/paths.ts'
import { base64DecodedBytes, decodeBase64, detectImageType } from '../src/features/attachments/detect.ts'
import { ATTACHMENT_TTL_MS, AttachmentStore } from '../src/features/attachments/store.ts'
import { buildPrompt, escapePath } from '../src/features/input/prompt.ts'
import { useTempHome } from './helpers.ts'

useTempHome()

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13])
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16])
const GIF = Buffer.from('GIF89a\x01\x00', 'latin1')
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBPVP8 ')])

describe('detectImageType', () => {
  test.each([
    [PNG, 'image/png'],
    [JPEG, 'image/jpeg'],
    [GIF, 'image/gif'],
    [WEBP, 'image/webp'],
  ])('recognizes %#', (bytes, type) => {
    expect(detectImageType(bytes)).toBe(type)
  })

  test('rejects other formats and truncated data', () => {
    expect(detectImageType(Buffer.from('%PDF-1.7'))).toBeNull()
    expect(detectImageType(Buffer.from('RIFF'))).toBeNull()
    expect(detectImageType(Buffer.alloc(0))).toBeNull()
  })
})

describe('base64', () => {
  test('decodes strict base64 only', () => {
    expect(decodeBase64(PNG.toString('base64'))).toEqual(PNG)
    expect(decodeBase64('data:image/png;base64,AAAA')).toBeNull()
    expect(decodeBase64('AAA')).toBeNull()
    expect(decodeBase64('AA AA')).toBeNull()
  })

  test('computes the decoded size without decoding', () => {
    for (const n of [0, 1, 2, 3, 10, 1000]) {
      expect(base64DecodedBytes(Buffer.alloc(n).toString('base64'))).toBe(n)
    }
  })
})

describe('buildPrompt', () => {
  test('text first, then one path per line', () => {
    expect(buildPrompt('  what is wrong?\n', ['/h/.claude-remote/attachments/a.jpg', '/h/b.png'])).toBe(
      'what is wrong?\n/h/.claude-remote/attachments/a.jpg\n/h/b.png',
    )
  })

  test('only paths when there is no text', () => {
    expect(buildPrompt('', ['/a.jpg', '/b.jpg'])).toBe('/a.jpg\n/b.jpg')
  })

  test('escapes spaces like a terminal drag-and-drop', () => {
    expect(escapePath('/Users/Jo Doe/a.jpg')).toBe('/Users/Jo\\ Doe/a.jpg')
  })
})

describe('AttachmentStore', () => {
  const store = (now?: () => number) => new AttachmentStore(paths.attachments(), silentLogger, now)

  test('saves a private file named from the validated type', async () => {
    const s = store()
    const id = await s.save('s1', 'image/png', PNG.toString('base64'))
    const [path] = s.resolve('s1', [id])
    expect(path).toBe(join(paths.attachments(), `${id}.png`))
    expect((await stat(path as string)).mode & 0o777).toBe(0o600)
    expect((await stat(paths.attachments())).mode & 0o777).toBe(0o700)
  })

  test('rejects bytes that do not match the declared type', async () => {
    await expect(store().save('s1', 'image/jpeg', PNG.toString('base64'))).rejects.toMatchObject({
      code: 'unsupported_media',
    })
    await expect(readdir(paths.attachments())).rejects.toMatchObject({ code: 'ENOENT' })
  })

  test('rejects oversized and malformed data', async () => {
    const big = Buffer.concat([JPEG, Buffer.alloc(5 * 1024 * 1024)]).toString('base64')
    await expect(store().save('s1', 'image/jpeg', big)).rejects.toMatchObject({ code: 'too_large' })
    await expect(store().save('s1', 'image/jpeg', '!!!!')).rejects.toMatchObject({ code: 'bad_request' })
  })

  test('resolves only ids issued to the same session', async () => {
    const s = store()
    const id = await s.save('s1', 'image/gif', GIF.toString('base64'))
    expect(() => s.resolve('s2', [id])).toThrow(expect.objectContaining({ code: 'not_found' }))
    expect(() => s.resolve('s1', ['../../etc/passwd'])).toThrow(
      expect.objectContaining({ code: 'not_found' }),
    )
  })

  test('prunes files older than a day, including leftovers', async () => {
    let now = Date.now()
    const s = store(() => now)
    const id = await s.save('s1', 'image/png', PNG.toString('base64'))
    const leftover = join(paths.attachments(), 'old.jpg')
    await writeFile(leftover, JPEG)
    const old = new Date(now - ATTACHMENT_TTL_MS - 1000)
    await utimes(leftover, old, old)
    await s.prune()
    expect(await readdir(paths.attachments())).toEqual([`${id}.png`])
    now += ATTACHMENT_TTL_MS + 1000
    await s.prune()
    expect(await readdir(paths.attachments())).toEqual([])
    expect(() => s.resolve('s1', [id])).toThrow(expect.objectContaining({ code: 'not_found' }))
  })
})
