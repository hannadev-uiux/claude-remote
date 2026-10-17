import type { AttachmentMimeType } from '@claude-remote/protocol'

/** File extension per accepted type; files are always named from the validated type. */
export const ATTACHMENT_EXTENSIONS: Record<AttachmentMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const startsWith = (bytes: Uint8Array, signature: readonly number[], offset = 0) =>
  bytes.length >= offset + signature.length && signature.every((b, i) => bytes[offset + i] === b)

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0))

/** Image type from its leading bytes (magic numbers), or null when it is none of the accepted ones. */
export function detectImageType(bytes: Uint8Array): AttachmentMimeType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (startsWith(bytes, ascii('GIF87a')) || startsWith(bytes, ascii('GIF89a'))) return 'image/gif'
  if (startsWith(bytes, ascii('RIFF')) && startsWith(bytes, ascii('WEBP'), 8)) return 'image/webp'
  return null
}

const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/

/** Decodes strict base64 (no whitespace, no data: prefix), or null when malformed. */
export function decodeBase64(data: string): Buffer | null {
  if (data.length % 4 !== 0 || !BASE64.test(data)) return null
  return Buffer.from(data, 'base64')
}

/** Decoded size of a base64 string, computed without decoding it. */
export function base64DecodedBytes(data: string): number {
  const padding = data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0
  return Math.floor((data.length * 3) / 4) - padding
}
