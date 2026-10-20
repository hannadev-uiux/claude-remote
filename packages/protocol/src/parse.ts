import type { z } from 'zod'
import { type ClientMessage, ClientMessageSchema } from './client.ts'
import type { ErrorCode } from './domain.ts'
import { type ServerMessage, ServerMessageSchema } from './server.ts'

export type ParseError = {
  code: Extract<ErrorCode, 'bad_request' | 'unknown_type'>
  message: string
  id?: string
  /** The raw `type` field, when it was a string, even an unknown one; for server-side logging only. */
  type?: string
}
export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: ParseError }

function parseWith<T>(
  schema: z.ZodType<T>,
  knownTypes: ReadonlySet<string>,
  raw: string | unknown,
): ParseResult<T> {
  let data: unknown = raw
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw)
    } catch {
      return { ok: false, error: { code: 'bad_request', message: 'invalid JSON' } }
    }
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { ok: false, error: { code: 'bad_request', message: 'message must be an object' } }
  }
  const record = data as Record<string, unknown>
  const id = typeof record.id === 'string' ? record.id : undefined
  const type = record.type
  if (typeof type !== 'string' || !knownTypes.has(type)) {
    return {
      ok: false,
      error: {
        code: 'unknown_type',
        message: `unknown type: ${String(type)}`,
        id,
        type: typeof type === 'string' ? type : undefined,
      },
    }
  }
  const result = schema.safeParse(data)
  if (!result.success) {
    const issue = result.error.issues[0]
    const path = issue?.path.join('.') || '(root)'
    return {
      ok: false,
      error: { code: 'bad_request', message: `${path}: ${issue?.message ?? 'invalid'}`, id, type },
    }
  }
  return { ok: true, value: result.data }
}

const clientTypes = new Set(ClientMessageSchema.options.map((o) => o.shape.type.value as string))
const serverTypes = new Set(ServerMessageSchema.options.map((o) => o.shape.type.value as string))

export function parseClientMessage(raw: string | unknown): ParseResult<ClientMessage> {
  return parseWith(ClientMessageSchema as z.ZodType<ClientMessage>, clientTypes, raw)
}

export function parseServerMessage(raw: string | unknown): ParseResult<ServerMessage> {
  return parseWith(ServerMessageSchema as z.ZodType<ServerMessage>, serverTypes, raw)
}
