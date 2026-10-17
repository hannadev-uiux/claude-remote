import { MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS } from '@remote-harness/protocol'

/** Longest side sent to Claude; the API downscales anything larger, so bigger only costs upload time. */
export const MAX_IMAGE_DIMENSION = 1568
export const JPEG_QUALITY = 0.8

/** An image ready to upload: re-encoded as JPEG, base64 without a data: prefix. */
export type PreparedImage = {
  key: string
  uri: string
  base64: string
  mimeType: 'image/jpeg'
  width: number
  height: number
}

/** Target size keeping the aspect ratio, or null when the image already fits (or its size is unknown). */
export function fitWithin(
  width: number,
  height: number,
  max = MAX_IMAGE_DIMENSION,
): { width: number; height: number } | null {
  if (width <= 0 || height <= 0) return null
  const longest = Math.max(width, height)
  if (longest <= max) return null
  const scale = max / longest
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

/** How many more images fit in the prompt. */
export function remainingSlots(count: number): number {
  return Math.max(0, MAX_ATTACHMENTS - count)
}

/** Decoded size of a base64 string. */
export function base64Bytes(data: string): number {
  const padding = data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0
  return Math.floor((data.length * 3) / 4) - padding
}

export function exceedsUploadLimit(base64: string): boolean {
  return base64Bytes(base64) > MAX_ATTACHMENT_BYTES
}
