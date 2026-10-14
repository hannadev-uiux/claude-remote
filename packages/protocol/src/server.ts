import { z } from 'zod'
import {
  CommandItemSchema,
  ErrorCodeSchema,
  FileItemSchema,
  MuteStateSchema,
  PermissionModeSchema,
  PermissionOutcomeSchema,
  PermissionRequestInfoSchema,
  ProfileSchema,
  ProjectItemSchema,
  RuleScopeSchema,
  SessionSchema,
  SessionStateSchema,
  SubagentInfoSchema,
  TranscriptEntrySchema,
} from './domain.ts'

const replyTo = z.string().optional()

export const ServerMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('auth.ok'),
    replyTo,
    protocolVersion: z.number().int(),
    daemonVersion: z.string(),
    profiles: z.array(ProfileSchema),
    defaultRuleScope: RuleScopeSchema,
    muted: MuteStateSchema,
  }),
  z.object({ type: z.literal('pong'), replyTo }),
  z.object({ type: z.literal('ack'), replyTo, data: z.record(z.string(), z.unknown()).optional() }),
  z.object({ type: z.literal('error'), replyTo, code: ErrorCodeSchema, message: z.string() }),
  z.object({ type: z.literal('sessions.snapshot'), replyTo, sessions: z.array(SessionSchema) }),
  z.object({ type: z.literal('session.updated'), session: SessionSchema }),
  z.object({ type: z.literal('session.removed'), sessionId: z.string() }),
  z.object({
    type: z.literal('session.state'),
    sessionId: z.string(),
    state: SessionStateSchema,
    permissionMode: PermissionModeSchema.nullable(),
  }),
  z.object({
    type: z.literal('transcript.entry'),
    sessionId: z.string(),
    agentId: z.string().optional(),
    cursor: z.number().int().nonnegative(),
    entry: TranscriptEntrySchema,
  }),
  z.object({
    type: z.literal('transcript.page'),
    replyTo,
    sessionId: z.string(),
    agentId: z.string().optional(),
    entries: z.array(TranscriptEntrySchema),
    hasMore: z.boolean(),
    /** Total number of lines known for the transcript when the page was built. */
    lineCount: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal('pane.frame'),
    sessionId: z.string(),
    text: z.string(),
    cols: z.number().int().positive(),
    rows: z.number().int().positive(),
  }),
  z.object({ type: z.literal('permission.request'), request: PermissionRequestInfoSchema }),
  z.object({
    type: z.literal('permission.resolved'),
    requestId: z.string(),
    sessionId: z.string(),
    outcome: PermissionOutcomeSchema,
  }),
  z.object({ type: z.literal('subagent.updated'), sessionId: z.string(), subagent: SubagentInfoSchema }),
  z.object({ type: z.literal('files.results'), replyTo, query: z.string(), items: z.array(FileItemSchema) }),
  z.object({ type: z.literal('commands.results'), replyTo, items: z.array(CommandItemSchema) }),
  z.object({ type: z.literal('projects.results'), replyTo, items: z.array(ProjectItemSchema) }),
  z.object({ type: z.literal('mute.updated'), muted: MuteStateSchema }),
])

export type ServerMessage = z.infer<typeof ServerMessageSchema>
export type ServerMessageType = ServerMessage['type']
export type ServerMessageOf<T extends ServerMessageType> = Extract<ServerMessage, { type: T }>
