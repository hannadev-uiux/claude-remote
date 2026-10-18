import { z } from 'zod'

export const PermissionModeSchema = z.enum([
  'default',
  'acceptEdits',
  'plan',
  'auto',
  'dontAsk',
  'bypassPermissions',
])
export type PermissionMode = z.infer<typeof PermissionModeSchema>

/** Modes the app may request. `bypassPermissions` is never offered remotely. */
export const SelectableModeSchema = z.enum(['default', 'acceptEdits', 'plan', 'auto'])
export type SelectableMode = z.infer<typeof SelectableModeSchema>

export const ProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  configDir: z.string().min(1),
  color: z.string().min(1),
})
export type Profile = z.infer<typeof ProfileSchema>

export const SessionStateSchema = z.enum(['running', 'waiting', 'idle', 'ended'])
export type SessionState = z.infer<typeof SessionStateSchema>

export const SubagentInfoSchema = z.object({
  agentId: z.string(),
  agentType: z.string().nullable(),
  description: z.string().nullable().default(null),
  state: z.enum(['running', 'done']),
  updatedAt: z.string(),
})
export type SubagentInfo = z.infer<typeof SubagentInfoSchema>

/** Git checkout of a session's directory: the worktree root and its branch (`null` when detached). */
export const CheckoutSchema = z.object({ root: z.string(), branch: z.string().nullable() })
export type Checkout = z.infer<typeof CheckoutSchema>

export const SessionSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  cwd: z.string(),
  title: z.string(),
  state: SessionStateSchema,
  permissionMode: PermissionModeSchema.nullable(),
  controllable: z.boolean(),
  paneId: z.string().nullable(),
  updatedAt: z.string(),
  subagents: z.array(SubagentInfoSchema).default([]),
  backgroundTasks: z.number().int().nonnegative().default(0),
  /** `null` outside git (and from older daemons). */
  checkout: CheckoutSchema.nullable().default(null),
})
export type Session = z.infer<typeof SessionSchema>

/** A live session can still change files: open in tmux and not ended. */
export function isLiveSession(session: Pick<Session, 'controllable' | 'state'>): boolean {
  return session.controllable && session.state !== 'ended'
}

/** Other live sessions working in the same git checkout as `session` (none outside git). */
export function checkoutPeers<T extends Pick<Session, 'id' | 'controllable' | 'state' | 'checkout'>>(
  session: Pick<Session, 'id' | 'checkout'>,
  sessions: readonly T[],
): T[] {
  const root = session.checkout?.root
  if (!root) return []
  return sessions.filter((s) => s.id !== session.id && s.checkout?.root === root && isLiveSession(s))
}

export const CheckoutPeerSchema = z.object({ id: z.string(), title: z.string() })
export type CheckoutPeer = z.infer<typeof CheckoutPeerSchema>

/**
 * An image in the transcript, without its data (fetched with `transcript.image`). `id` locates it in
 * the transcript (opaque to the app); `bytes` is the decoded size, so oversized images can be skipped.
 */
export const ImageRefSchema = z.object({
  id: z.string().min(1),
  mediaType: z.string(),
  bytes: z.number().int().nonnegative(),
})
export type ImageRef = z.infer<typeof ImageRefSchema>

/** Largest transcript image the daemon sends to the app (decoded bytes; the Claude API limit). */
export const MAX_TRANSCRIPT_IMAGE_BYTES = 5 * 1024 * 1024

/** Absent in older daemons. */
const images = z.array(ImageRefSchema).default([])

const entryBase = {
  /** Stable unique key: `<uuid>:<index>`. */
  key: z.string(),
  /** Line number in the transcript file (0-based). */
  cursor: z.number().int().nonnegative(),
  /** Position of this entry within its line. */
  index: z.number().int().nonnegative(),
  uuid: z.string(),
  timestamp: z.string().nullable(),
  isSidechain: z.boolean(),
}

export const TranscriptEntrySchema = z.discriminatedUnion('kind', [
  /** `text` is empty when the prompt only has images. */
  z.object({ ...entryBase, kind: z.literal('user'), text: z.string(), images }),
  z.object({ ...entryBase, kind: z.literal('assistant_text'), text: z.string() }),
  z.object({ ...entryBase, kind: z.literal('thinking'), text: z.string() }),
  z.object({
    ...entryBase,
    kind: z.literal('tool_use'),
    toolUseId: z.string(),
    name: z.string(),
    input: z.record(z.string(), z.unknown()),
  }),
  z.object({
    ...entryBase,
    kind: z.literal('tool_result'),
    toolUseId: z.string(),
    content: z.string(),
    isError: z.boolean(),
    truncated: z.boolean(),
    images,
  }),
  z.object({
    ...entryBase,
    kind: z.literal('system'),
    subtype: z.string(),
    text: z.string(),
    /** `turn_duration` only: lets the app write the text in its own language. */
    durationMs: z.number().optional(),
  }),
  z.object({ ...entryBase, kind: z.literal('unknown'), raw: z.string() }),
])
export type TranscriptEntry = z.infer<typeof TranscriptEntrySchema>
export type TranscriptEntryKind = TranscriptEntry['kind']

export const RuleScopeSchema = z.enum(['profile', 'project'])
export type RuleScope = z.infer<typeof RuleScopeSchema>

/** Platform of a paired phone; picks the push payload block (APNs or Android). */
export const DevicePlatformSchema = z.enum(['ios', 'android'])
export type DevicePlatform = z.infer<typeof DevicePlatformSchema>

/**
 * Where a daemon without a Firebase service account sends this phone's pushes: the push relay and
 * the grant it issued to the app (the FCM token, sealed; only the relay can open it).
 */
export const PushRelaySchema = z.object({
  url: z.url({ protocol: /^https$/ }),
  grant: z.string().min(1).max(16_384),
})
export type PushRelay = z.infer<typeof PushRelaySchema>

/** States of a session's live status (Live Activity / Android notification). */
export const LiveStateSchema = z.enum(['working', 'waiting', 'done', 'closed'])
export type LiveState = z.infer<typeof LiveStateSchema>

/** Name the app passes to `createLiveActivity` and the daemon puts in `content-state.name`. */
export const LIVE_ACTIVITY_NAME = 'SessionActivity'

/**
 * Props of the live status, rendered as they are by the widget (it cannot translate): texts arrive
 * already translated. Besides the session title and folder, never session content: names, state,
 * step categories with tool names, tool count, times. Fields after `startedAt` have defaults because
 * older daemons do not send them.
 */
export const LiveStatusPropsSchema = z.object({
  /** Profile name. */
  title: z.string(),
  state: LiveStateSchema,
  status: z.string(),
  /** Translated step category ("running a command"), empty when none. */
  step: z.string(),
  /** Translated tool count ("3 tools"), empty when none. */
  tools: z.string(),
  /** Start of the turn, epoch milliseconds (drives the elapsed timer). */
  startedAt: z.number(),
  /** Name of the daemon's computer, empty when unknown. */
  host: z.string().default(''),
  /** Session title. */
  session: z.string().default(''),
  /** Session folder, home shortened to `~`. */
  path: z.string().default(''),
  /** Latest steps of the turn, newest first, translated ("Bash · running a command"). */
  recent: z.array(z.string()).default([]),
  /** Translated "time ago" template with a `{time}` placeholder ("{time} ago"). */
  ago: z.string().default(''),
  /** When the state last changed, epoch milliseconds (0 when unknown). */
  changedAt: z.number().default(0),
  /** End of the turn (done or closed), epoch milliseconds: the elapsed timer stops there. */
  endedAt: z.number().nullable().default(null),
})
export type LiveStatusProps = z.infer<typeof LiveStatusPropsSchema>

export const QuestionKindSchema = z.enum(['choice', 'text', 'number'])
export type QuestionKind = z.infer<typeof QuestionKindSchema>

export const QuestionSchema = z.object({
  question: z.string(),
  header: z.string().nullable(),
  kind: QuestionKindSchema,
  options: z.array(z.object({ label: z.string(), description: z.string().nullable() })),
  multiSelect: z.boolean(),
})
export type Question = z.infer<typeof QuestionSchema>

/** Structured content of a request Claude Code shows as a menu (`AskUserQuestion`, `ExitPlanMode`). */
export const PermissionInteractionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('question'), title: z.string().nullable(), questions: z.array(QuestionSchema) }),
  z.object({ kind: z.literal('plan'), plan: z.string().nullable() }),
])
export type PermissionInteraction = z.infer<typeof PermissionInteractionSchema>

/** Leaving plan mode never offers `auto` or `bypassPermissions`. */
export const PlanDecisionSchema = z.enum(['acceptEdits', 'default', 'keepPlanning'])
export type PlanDecision = z.infer<typeof PlanDecisionSchema>

export const PermissionAnswerSchema = z.discriminatedUnion('kind', [
  /** Question text → answer; multiple choices already joined with ", ". */
  z.object({ kind: z.literal('question'), answers: z.record(z.string(), z.string()) }),
  z.object({ kind: z.literal('plan'), decision: PlanDecisionSchema, feedback: z.string().optional() }),
])
export type PermissionAnswer = z.infer<typeof PermissionAnswerSchema>

export const PermissionRequestInfoSchema = z.object({
  requestId: z.string(),
  sessionId: z.string(),
  profileId: z.string(),
  tool: z.string(),
  input: z.record(z.string(), z.unknown()),
  suggestedRule: z.string().nullable(),
  defaultScope: RuleScopeSchema,
  createdAt: z.string(),
  expiresAt: z.string(),
  interaction: PermissionInteractionSchema.optional(),
})
export type PermissionRequestInfo = z.infer<typeof PermissionRequestInfoSchema>

export const PermissionOutcomeSchema = z.enum(['allowed', 'denied', 'expired', 'cancelled'])
export type PermissionOutcome = z.infer<typeof PermissionOutcomeSchema>

export const CommandSourceSchema = z.enum(['builtin', 'profile', 'project', 'plugin'])
export type CommandSource = z.infer<typeof CommandSourceSchema>

export const CommandItemSchema = z.object({
  name: z.string(),
  description: z.string(),
  source: CommandSourceSchema,
  interactive: z.boolean().default(false),
})
export type CommandItem = z.infer<typeof CommandItemSchema>

export const FileItemSchema = z.object({ path: z.string(), kind: z.enum(['file', 'dir']) })
export type FileItem = z.infer<typeof FileItemSchema>

export const ProjectItemSchema = z.object({ cwd: z.string(), lastUsedAt: z.string() })
export type ProjectItem = z.infer<typeof ProjectItemSchema>

export const MuteStateSchema = z.object({
  profiles: z.array(z.string()).default([]),
  sessions: z.array(z.string()).default([]),
})
export type MuteState = z.infer<typeof MuteStateSchema>

/** Image types Claude accepts; the daemon also checks the bytes against the declared type. */
export const ATTACHMENT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
export const AttachmentMimeTypeSchema = z.enum(ATTACHMENT_MIME_TYPES)
export type AttachmentMimeType = z.infer<typeof AttachmentMimeTypeSchema>
/** Images per prompt. */
export const MAX_ATTACHMENTS = 4
/** Decoded bytes per image (the Claude API limit). */
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024

/** Keys the app may send to a session. Anything else is rejected by the daemon. */
export const ALLOWED_KEYS = [
  'Enter',
  'Escape',
  'Up',
  'Down',
  'Left',
  'Right',
  'Tab',
  'BTab',
  'C-c',
  'C-d',
  'Space',
  'BSpace',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
] as const
export const KeySchema = z.enum(ALLOWED_KEYS)
export type Key = z.infer<typeof KeySchema>

export const ErrorCodeSchema = z.enum([
  'bad_request',
  'unknown_type',
  'unauthorized',
  'protocol_mismatch',
  'not_found',
  'not_controllable',
  'invalid_key',
  'too_large',
  'unsupported_media',
  'already_resolved',
  'mode_forbidden',
  'mode_unreachable',
  'session_busy',
  'invalid_cwd',
  'internal',
])
export type ErrorCode = z.infer<typeof ErrorCodeSchema>
