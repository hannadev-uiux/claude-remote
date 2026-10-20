import { z } from 'zod'
import {
  AccountLimitsSchema,
  CheckoutPeerSchema,
  CheckoutSchema,
  CommandItemSchema,
  DaemonUpdateChannelSchema,
  DaemonUpdateInfoSchema,
  DirectoryItemSchema,
  ErrorCodeSchema,
  FileItemSchema,
  MachinePermissionSchema,
  ModelInfoSchema,
  MuteStateSchema,
  PermissionModeSchema,
  PermissionOutcomeSchema,
  PermissionRequestInfoSchema,
  ProfileSchema,
  ProjectItemSchema,
  ProviderCreditsSchema,
  PushModeSchema,
  PushTestResultSchema,
  QueuedMessageSchema,
  RejectedRequestSchema,
  RuleScopeSchema,
  SessionSchema,
  SessionStateSchema,
  SubagentInfoSchema,
  TranscriptEntrySchema,
  WorktreeCopySchema,
  WorktreeInfoSchema,
} from './domain.ts'

const replyTo = z.string().optional()

export const ServerMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('auth.ok'),
    replyTo,
    protocolVersion: z.number().int(),
    daemonVersion: z.string(),
    /** Name of the daemon's computer (absent in older daemons). */
    host: z.string().optional(),
    profiles: z.array(ProfileSchema),
    defaultRuleScope: RuleScopeSchema,
    muted: MuteStateSchema,
    /** Absent in older daemons. */
    push: z.object({ mode: PushModeSchema }).optional(),
    /** Present when the daemon accepts `daemon.update.*` (absent in older daemons). */
    update: z.object({ channel: DaemonUpdateChannelSchema }).optional(),
    /** Present when the daemon accepts `live.follow` and the other follow messages. */
    live: z.object({ follow: z.boolean() }).optional(),
  }),
  /** Reply to the follow messages: what this phone follows. */
  z.object({
    type: z.literal('live.followed'),
    replyTo,
    sessionIds: z.array(z.string()),
    autoFollowProfiles: z.array(z.string()),
  }),
  z.object({ type: z.literal('pong'), replyTo }),
  z.object({ type: z.literal('ack'), replyTo, data: z.record(z.string(), z.unknown()).optional() }),
  z.object({ type: z.literal('error'), replyTo, code: ErrorCodeSchema, message: z.string() }),
  z.object({ type: z.literal('sessions.snapshot'), replyTo, sessions: z.array(SessionSchema) }),
  z.object({ type: z.literal('session.updated'), session: SessionSchema }),
  z.object({ type: z.literal('session.removed'), sessionId: z.string() }),
  /** Reply to `session.start`; `sessionId` is `null` until the pane's `SessionStart` hook registers it. */
  z.object({
    type: z.literal('session.started'),
    replyTo,
    paneId: z.string(),
    sessionId: z.string().nullable(),
  }),
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
  /** A session's queued prompts, in delivery order; sent on every change and replayed on connect. */
  z.object({ type: z.literal('session.queue'), sessionId: z.string(), items: z.array(QueuedMessageSchema) }),
  z.object({ type: z.literal('attachment.uploaded'), replyTo, attachmentId: z.string().min(1) }),
  z.object({
    type: z.literal('transcript.image'),
    replyTo,
    imageId: z.string(),
    mediaType: z.string(),
    /** Base64, at most `MAX_TRANSCRIPT_IMAGE_BYTES` decoded. */
    data: z.string(),
  }),
  z.object({ type: z.literal('files.results'), replyTo, query: z.string(), items: z.array(FileItemSchema) }),
  z.object({ type: z.literal('commands.results'), replyTo, items: z.array(CommandItemSchema) }),
  z.object({ type: z.literal('projects.results'), replyTo, items: z.array(ProjectItemSchema) }),
  z.object({
    type: z.literal('models.results'),
    replyTo,
    profileId: z.string(),
    models: z.array(ModelInfoSchema),
    /** When the list was fetched from the provider. */
    fetchedAt: z.string(),
    /** The provider could not be reached and this is the last list fetched. */
    stale: z.boolean(),
  }),
  z.object({
    type: z.literal('provider.info'),
    replyTo,
    profileId: z.string(),
    /** A provider key is stored on the computer for this profile (the key itself never travels). */
    hasKey: z.boolean(),
    /** `null` without a key or when the provider did not answer. */
    credits: ProviderCreditsSchema.nullable(),
  }),
  z.object({
    type: z.literal('voice.polish.result'),
    replyTo,
    text: z.string(),
    /** `false` when polishing was unsupported, failed, timed out, or left the text unchanged. */
    applied: z.boolean(),
  }),
  z.object({
    type: z.literal('diagnostics.result'),
    replyTo,
    daemonVersion: z.string(),
    /** Most recent first, at most `DIAGNOSTICS_LIMIT`. */
    errors: z.array(RejectedRequestSchema),
  }),
  z.object({
    type: z.literal('directories.results'),
    replyTo,
    /** Absolute path that was listed. */
    path: z.string(),
    /** `null` at the home folder: the listing never goes above it. */
    parent: z.string().nullable(),
    home: z.string(),
    items: z.array(DirectoryItemSchema),
    /** More entries matched than `limit`. */
    truncated: z.boolean(),
  }),
  z.object({
    type: z.literal('checkout.info'),
    replyTo,
    checkout: CheckoutSchema.nullable(),
    peers: z.array(CheckoutPeerSchema),
    /** Inside a checkout: what an isolated copy (worktree) would inherit. */
    worktreeCopy: WorktreeCopySchema.optional(),
  }),
  /** `null` when the session's folder is not inside a linked git worktree. */
  z.object({ type: z.literal('worktree.info'), replyTo, worktree: WorktreeInfoSchema.nullable() }),
  z.object({ type: z.literal('mute.updated'), muted: MuteStateSchema }),
  /** Reply to `daemon.update.check` / `start`, and broadcast whenever an update run changes. */
  z.object({ type: z.literal('daemon.update.info'), replyTo, info: DaemonUpdateInfoSchema }),
  z.object({ type: z.literal('push.testResult'), replyTo, result: PushTestResultSchema }),
  /** Usage limits of a profile's account; sent when they change and to every client that connects. */
  z.object({ type: z.literal('limits.updated'), limits: AccountLimitsSchema }),
  /** Reply to `machine.permissions`: never folder contents, only per-row/per-folder status. */
  z.object({
    type: z.literal('machine.permissions.results'),
    replyTo,
    permissions: z.array(MachinePermissionSchema),
  }),
])

export type ServerMessage = z.infer<typeof ServerMessageSchema>
export type ServerMessageType = ServerMessage['type']
export type ServerMessageOf<T extends ServerMessageType> = Extract<ServerMessage, { type: T }>
