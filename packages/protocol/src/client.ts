import { z } from 'zod'
import { RuleScopeSchema } from './domain.ts'

const id = z.string().min(1)
const sessionId = z.string().min(1)

export const ClientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('auth'),
    id,
    token: z.string().min(1),
    protocolVersion: z.number().int(),
    client: z.string().optional(),
  }),
  z.object({ type: z.literal('ping'), id }),
  z.object({ type: z.literal('sessions.list'), id }),
  z.object({
    type: z.literal('session.subscribe'),
    id,
    sessionId,
    agentId: z.string().optional(),
    sinceCursor: z.number().int().nonnegative().optional(),
  }),
  z.object({ type: z.literal('session.unsubscribe'), id, sessionId, agentId: z.string().optional() }),
  z.object({
    type: z.literal('session.history'),
    id,
    sessionId,
    agentId: z.string().optional(),
    before: z.number().int().nonnegative(),
    limit: z.number().int().positive().max(200).default(50),
  }),
  z.object({ type: z.literal('session.input'), id, sessionId, text: z.string().min(1) }),
  // Validated by the daemon against ALLOWED_KEYS so it can answer `invalid_key`.
  z.object({ type: z.literal('session.key'), id, sessionId, key: z.string().min(1) }),
  z.object({ type: z.literal('session.setMode'), id, sessionId, mode: z.string() }),
  z.object({
    type: z.literal('permission.respond'),
    id,
    requestId: z.string().min(1),
    decision: z.enum(['allow', 'deny']),
    always: z.object({ rule: z.string().min(1), scope: RuleScopeSchema }).optional(),
  }),
  z.object({ type: z.literal('device.register'), id, fcmToken: z.string().min(1) }),
  z.object({ type: z.literal('app.visibility'), id, foreground: z.boolean() }),
  z.object({
    type: z.literal('files.search'),
    id,
    sessionId,
    query: z.string(),
    limit: z.number().int().positive().max(100).default(20),
  }),
  z.object({ type: z.literal('commands.list'), id, sessionId }),
  z.object({ type: z.literal('projects.list'), id, profileId: z.string().min(1) }),
  z.object({ type: z.literal('session.start'), id, profileId: z.string().min(1), cwd: z.string().min(1) }),
  z.object({ type: z.literal('session.resume'), id, profileId: z.string().min(1), sessionId }),
  z.object({ type: z.literal('pane.subscribe'), id, sessionId }),
  z.object({ type: z.literal('pane.unsubscribe'), id, sessionId }),
  z.object({
    type: z.literal('settings.mute'),
    id,
    target: z.enum(['profile', 'session']),
    targetId: z.string().min(1),
    muted: z.boolean(),
  }),
])

export type ClientMessage = z.infer<typeof ClientMessageSchema>
export type ClientMessageType = ClientMessage['type']
export type ClientMessageOf<T extends ClientMessageType> = Extract<ClientMessage, { type: T }>
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never
/** Shape accepted by a client `request()`: the `id` is filled in by the client. */
export type ClientRequest = DistributiveOmit<z.input<typeof ClientMessageSchema>, 'id'>
