import { z } from 'zod'
import {
  AttachmentMimeTypeSchema,
  DaemonUpdateChannelSchema,
  DevicePlatformSchema,
  DIRECTORY_LIST_LIMIT,
  InputModeSchema,
  LiveFollowDeviceSchema,
  LivePaletteSchema,
  MAX_ATTACHMENTS,
  MAX_DIRECTORY_LIST_LIMIT,
  PermissionAnswerSchema,
  PushRelaySchema,
  RuleScopeSchema,
  SessionNameSchema,
  SettingsPaneSchema,
  WorktreeActionSchema,
} from './domain.ts'

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
  /** Data of an image ref from a transcript entry; answered with `transcript.image`. */
  z.object({
    type: z.literal('transcript.image'),
    id,
    sessionId,
    agentId: z.string().optional(),
    imageId: z.string().min(1),
  }),
  z.object({
    type: z.literal('session.history'),
    id,
    sessionId,
    agentId: z.string().optional(),
    before: z.number().int().nonnegative(),
    limit: z.number().int().positive().max(200).default(50),
  }),
  z.object({
    type: z.literal('session.input'),
    id,
    sessionId,
    // May be empty when the prompt only carries images (the daemon rejects an empty prompt).
    text: z.string(),
    attachmentIds: z.array(z.string().min(1)).min(1).max(MAX_ATTACHMENTS).optional(),
    /** `now` pastes right away (default); `queue` holds it; `auto` holds it only while the session is busy. */
    mode: InputModeSchema.default('now'),
  }),
  /** One image per message; answered with `attachment.uploaded`. Size and bytes are checked by the daemon. */
  z.object({
    type: z.literal('attachment.upload'),
    id,
    sessionId,
    mimeType: AttachmentMimeTypeSchema,
    data: z.string().min(1),
  }),
  // Validated by the daemon against ALLOWED_KEYS so it can answer `invalid_key`.
  z.object({ type: z.literal('session.key'), id, sessionId, key: z.string().min(1) }),
  /** Queued prompts: edit the text (clears a delivery error), drop one, deliver one now, deliver all now. */
  z.object({ type: z.literal('queue.update'), id, sessionId, itemId: z.string().min(1), text: z.string() }),
  z.object({ type: z.literal('queue.remove'), id, sessionId, itemId: z.string().min(1) }),
  z.object({ type: z.literal('queue.sendNow'), id, sessionId, itemId: z.string().min(1) }),
  z.object({ type: z.literal('queue.flush'), id, sessionId }),
  z.object({ type: z.literal('session.setMode'), id, sessionId, mode: z.string() }),
  z.object({
    type: z.literal('permission.respond'),
    id,
    requestId: z.string().min(1),
    decision: z.enum(['allow', 'deny']),
    always: z.object({ rule: z.string().min(1), scope: RuleScopeSchema }).optional(),
  }),
  z.object({
    type: z.literal('permission.answer'),
    id,
    requestId: z.string().min(1),
    answer: PermissionAnswerSchema,
  }),
  z.object({
    type: z.literal('device.register'),
    id,
    fcmToken: z.string().min(1),
    // Optional for apps paired before Android support (they are iOS).
    platform: DevicePlatformSchema.optional(),
    relay: PushRelaySchema.optional(),
  }),
  /** This phone turned push off: the daemon forgets its token. */
  z.object({ type: z.literal('device.unregister'), id, fcmToken: z.string().min(1) }),
  z.object({ type: z.literal('app.visibility'), id, foreground: z.boolean() }),
  /** Sends a test push to this phone only (its registered token); answered with `push.testResult`. */
  z.object({ type: z.literal('push.test'), id, fcmToken: z.string().min(1) }),
  z.object({
    type: z.literal('live.register'),
    id,
    sessionId,
    platform: DevicePlatformSchema,
    fcmToken: z.string().min(1),
    /** iOS Live Activity push token (hex); absent on Android. */
    activityToken: z.string().min(1).optional(),
    relay: PushRelaySchema.optional(),
    /** App theme colors for the live status, echoed by the daemon in every update. */
    palette: LivePaletteSchema.optional(),
    /**
     * Android: the app draws the live status itself from FCM data messages (with Allow / Deny);
     * absent = the system draws it from the push's notification block.
     */
    androidDataMessages: z.boolean().optional(),
  }),
  z.object({ type: z.literal('live.unregister'), id, sessionId }),
  /** This phone follows the session: later turns start its live status in the background. */
  z.object({ type: z.literal('live.follow'), id, sessionId, device: LiveFollowDeviceSchema }),
  z.object({ type: z.literal('live.unfollow'), id, sessionId, fcmToken: z.string().min(1) }),
  /** Follow every new session of the profile on this phone (or stop). */
  z.object({
    type: z.literal('live.autoFollow'),
    id,
    profileId: z.string().min(1),
    enabled: z.boolean(),
    device: LiveFollowDeviceSchema,
  }),
  /** Refreshes this phone's delivery data and asks for what it follows. */
  z.object({ type: z.literal('live.follows'), id, device: LiveFollowDeviceSchema }),
  z.object({
    type: z.literal('files.search'),
    id,
    sessionId,
    query: z.string(),
    limit: z.number().int().positive().max(100).default(20),
  }),
  z.object({ type: z.literal('commands.list'), id, sessionId }),
  z.object({ type: z.literal('projects.list'), id, profileId: z.string().min(1) }),
  /** Models of the profile's provider (cached by the daemon); `bad_request` for a profile without one. */
  z.object({ type: z.literal('models.list'), id, profileId: z.string().min(1) }),
  /** Whether the profile's provider key is stored, and the credits left. */
  z.object({ type: z.literal('provider.status'), id, profileId: z.string().min(1) }),
  /** Rewrites a dictated transcript through the session's agent CLI; falls back to `text` unchanged. */
  z.object({ type: z.literal('voice.polish'), id, sessionId, text: z.string().min(1) }),
  /** Subdirectories of `path` (`~`, `~/…` or absolute, inside the home folder), filtered by name `prefix`. */
  z.object({
    type: z.literal('directories.list'),
    id,
    path: z.string().min(1),
    prefix: z.string().optional(),
    /** Includes names starting with `.`. */
    hidden: z.boolean().optional(),
    limit: z.number().int().positive().max(MAX_DIRECTORY_LIST_LIMIT).default(DIRECTORY_LIST_LIMIT),
  }),
  z.object({
    type: z.literal('session.start'),
    id,
    profileId: z.string().min(1),
    cwd: z.string().min(1),
    /** Runs Claude Code with `--worktree`: its own git worktree and branch. */
    worktree: z.boolean().optional(),
    /** Model of the new session (`--model <id>`); the profile's provider default when absent. */
    model: z.string().min(1).optional(),
    /** Display name: the session's title at once, and `--name` for agents that take one. */
    name: SessionNameSchema.optional(),
  }),
  z.object({ type: z.literal('checkout.inspect'), id, profileId: z.string().min(1), cwd: z.string().min(1) }),
  z.object({ type: z.literal('session.resume'), id, profileId: z.string().min(1), sessionId }),
  /** Ends the session gracefully (deny pending, Escape, /exit, then the pane); optional worktree cleanup. */
  z.object({ type: z.literal('session.close'), id, sessionId, worktree: WorktreeActionSchema.optional() }),
  z.object({ type: z.literal('worktree.inspect'), id, sessionId }),
  z.object({ type: z.literal('worktree.cleanup'), id, sessionId, action: WorktreeActionSchema }),
  z.object({ type: z.literal('pane.subscribe'), id, sessionId }),
  /** Shows the session's pane in a terminal on the computer (tray "Open in terminal (tmux)"). */
  z.object({ type: z.literal('pane.focus'), id, sessionId }),
  z.object({ type: z.literal('pane.unsubscribe'), id, sessionId }),
  /** Update info of the daemon; a `channel` is saved to its config first, `force` skips the rate limit. */
  z.object({
    type: z.literal('daemon.update.check'),
    id,
    channel: DaemonUpdateChannelSchema.optional(),
    force: z.boolean().optional(),
  }),
  /** Updates the daemon to the channel's latest version; it restarts at the end. */
  z.object({ type: z.literal('daemon.update.start'), id, channel: DaemonUpdateChannelSchema }),
  /** The daemon's recent rejected requests (type and code only), for "Report a problem". */
  z.object({ type: z.literal('diagnostics.errors'), id }),
  /** Status of the computer-side permissions shown on the Permissions screen. */
  z.object({ type: z.literal('machine.permissions'), id }),
  /** Opens a System Settings pane for a denied computer permission (macOS; a no-op elsewhere). */
  z.object({ type: z.literal('machine.openSettingsPane'), id, pane: SettingsPaneSchema }),
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
