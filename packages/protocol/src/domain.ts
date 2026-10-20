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

/** Coding agents the app knows (badge, color); only those with a daemon adapter can run. */
export const AgentIdSchema = z.enum(['claude', 'codex', 'kimi', 'qwen'])
export type AgentId = z.infer<typeof AgentIdSchema>

/** Model gateways a profile can route Claude Code through; a profile without one uses the Anthropic account. */
export const ProviderKindSchema = z.enum(['openrouter'])
export type ProviderKind = z.infer<typeof ProviderKindSchema>

/** Product names of the providers (not translated); shown in the dashed `via …` chip. */
export const PROVIDER_NAMES: Record<ProviderKind, string> = { openrouter: 'OpenRouter' }

export const ProviderSchema = z.object({
  kind: ProviderKindSchema,
  /** Anthropic-compatible endpoint; absent = the provider's own (`https://openrouter.ai/api`). */
  baseUrl: z.string().url().optional(),
  /** Default model of new sessions; absent = whatever the gateway serves for Claude Code's default. */
  model: z.string().min(1).optional(),
  smallFastModel: z.string().min(1).optional(),
})
export type Provider = z.infer<typeof ProviderSchema>

export const ProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  configDir: z.string().min(1),
  color: z.string().min(1),
  /** The agent this profile launches; absent means Claude Code (older configs and daemons). */
  agent: AgentIdSchema.optional(),
  /** The model provider; absent means the Anthropic account logged into Claude Code. */
  provider: ProviderSchema.optional(),
})
export type Profile = z.infer<typeof ProfileSchema>

/** A model a provider lists; prices in USD per million tokens, `null` when the provider does not say. */
export const ModelInfoSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  contextLength: z.number().int().positive().nullable(),
  promptPrice: z.number().nonnegative().nullable(),
  completionPrice: z.number().nonnegative().nullable(),
  /** Tool use (Claude Code needs it). */
  tools: z.boolean(),
  /** Extended thinking / reasoning. */
  reasoning: z.boolean(),
  /** Prompt caching. */
  caching: z.boolean(),
})
export type ModelInfo = z.infer<typeof ModelInfoSchema>

/** Credits of a provider account, in USD: bought and used so far. */
export const ProviderCreditsSchema = z.object({ total: z.number(), used: z.number() })
export type ProviderCredits = z.infer<typeof ProviderCreditsSchema>

export const SessionStateSchema = z.enum(['running', 'waiting', 'idle', 'ended'])
export type SessionState = z.infer<typeof SessionStateSchema>

export const SubagentInfoSchema = z.object({
  agentId: z.string(),
  agentType: z.string().nullable(),
  description: z.string().nullable().default(null),
  state: z.enum(['running', 'done']),
  updatedAt: z.string(),
  /** When the subagent was first seen (`null` from older daemons). */
  startedAt: z.string().nullable().default(null),
  /** Tool uses in its transcript so far. */
  toolCount: z.number().int().nonnegative().default(0),
})
export type SubagentInfo = z.infer<typeof SubagentInfoSchema>

/** Git checkout of a session's directory: the worktree root and its branch (`null` when detached). */
export const CheckoutSchema = z.object({ root: z.string(), branch: z.string().nullable() })
export type Checkout = z.infer<typeof CheckoutSchema>

/** Context window usage reported by Claude Code's status line. */
export const ContextUsageSchema = z.object({
  usedTokens: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  /** 0-100. */
  percent: z.number().min(0),
})
export type ContextUsage = z.infer<typeof ContextUsageSchema>

/** What Claude Code's status line reports for a session; unknown items are `null`, never zero. */
export const SessionStatusSchema = z.object({
  /** Display name ("Opus 5.5"). */
  model: z.string().nullable(),
  /** Reasoning effort level ("high"), only for models that support it. */
  effort: z.string().nullable(),
  context: ContextUsageSchema.nullable(),
})
export type SessionStatus = z.infer<typeof SessionStatusSchema>

/** A usage limit window of the account: percentage used and when it resets (epoch milliseconds). */
export const UsageWindowSchema = z.object({ percent: z.number().min(0), resetsAt: z.number() })
export type UsageWindow = z.infer<typeof UsageWindowSchema>

/** Usage limits of a profile's Claude account (subscribers only); `null` windows are unknown. */
export const AccountLimitsSchema = z.object({
  profileId: z.string().min(1),
  fiveHour: UsageWindowSchema.nullable(),
  sevenDay: UsageWindowSchema.nullable(),
  updatedAt: z.string(),
})
export type AccountLimits = z.infer<typeof AccountLimitsSchema>

export const SessionSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  /** The profile's agent; absent means Claude Code (older daemons). */
  agent: AgentIdSchema.optional(),
  cwd: z.string(),
  title: z.string(),
  state: SessionStateSchema,
  permissionMode: PermissionModeSchema.nullable(),
  /** Codex: the approval policy (`on-request`, `never`, …); `null` for Claude Code, until known and from older daemons. */
  approvalPolicy: z.string().nullable().default(null),
  controllable: z.boolean(),
  paneId: z.string().nullable(),
  updatedAt: z.string(),
  subagents: z.array(SubagentInfoSchema).default([]),
  backgroundTasks: z.number().int().nonnegative().default(0),
  /** `null` outside git (and from older daemons). */
  checkout: CheckoutSchema.nullable().default(null),
  /** `null` until the session's status line reports (and from older daemons). */
  status: SessionStatusSchema.nullable().default(null),
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

/** A linked git worktree a session works in (never the repository's main checkout). */
export const WorktreeInfoSchema = z.object({
  path: z.string(),
  branch: z.string().nullable(),
  /** The repository's main checkout. */
  mainRoot: z.string(),
  /** Modified or untracked files. */
  dirty: z.number().int().nonnegative(),
  /** Commits reachable from HEAD and from no remote ref (also when the branch has no upstream). */
  unpushed: z.number().int().nonnegative(),
})
export type WorktreeInfo = z.infer<typeof WorktreeInfoSchema>

/**
 * What to do with a session's worktree: `delete` only when clean and pushed; `push-delete` commits
 * and pushes first; `discard-delete` throws the work away (asked twice in the app).
 */
export const WorktreeActionSchema = z.enum(['delete', 'push-delete', 'discard-delete'])
export type WorktreeAction = z.infer<typeof WorktreeActionSchema>

/** Data of the `ack` to `session.close`. */
export const CloseResultSchema = z.object({
  closed: z.enum(['exited', 'killed', 'already']),
  worktree: z.enum(['deleted', 'kept']).optional(),
})
export type CloseResult = z.infer<typeof CloseResultSchema>

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
    /** `task_notification` only: `completed`, `failed`, `stopped`, `killed` or another value. */
    status: z.string().optional(),
    /** `task_notification` only: extra explanation, when Claude Code gives one. */
    note: z.string().optional(),
    /** `tagged` only: the first tag name of an entry made of tags the daemon does not know. */
    tag: z.string().optional(),
    /** `compact_boundary` only: the compaction trigger (`manual`, `auto`), when Claude Code reports one. */
    trigger: z.string().optional(),
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

/**
 * How the daemon sends pushes: straight to FCM with a Firebase service account (`firebase`), through
 * the push relay with each phone's grant (`relay`), or not at all (`off`).
 */
export const PushModeSchema = z.enum(['firebase', 'relay', 'off'])
export type PushMode = z.infer<typeof PushModeSchema>

export const PushTestResultSchema = z.enum(['sent', 'off', 'unregistered', 'failed'])
export type PushTestResult = z.infer<typeof PushTestResultSchema>

/** States of a session's live status (Live Activity / Android notification). */
export const LiveStateSchema = z.enum(['working', 'waiting', 'done', 'closed'])
export type LiveState = z.infer<typeof LiveStateSchema>

/** Name the app passes to `createLiveActivity` and the daemon puts in `content-state.name`. */
export const LIVE_ACTIVITY_NAME = 'SessionActivity'

const HexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?$/)

/**
 * App theme colors the live status is drawn with. The app sends them when it registers; the daemon
 * echoes them in every update, since the widget cannot read the app's theme.
 */
export const LivePaletteSchema = z.object({
  background: HexColorSchema,
  text: HexColorSchema,
  textMuted: HexColorSchema,
  /** Working state. */
  accent: HexColorSchema,
  /** Done state. */
  success: HexColorSchema,
  /** Waiting state. */
  warning: HexColorSchema,
})
export type LivePalette = z.infer<typeof LivePaletteSchema>

/**
 * Props of the live status, rendered as they are by the widget (it cannot translate): texts arrive
 * already translated. Besides the session title and folder, never session content: names, state,
 * step categories with tool names, tool count, times. Fields after `startedAt` have defaults because
 * older daemons do not send them.
 */
/** The tool permission a live status waits for, answerable from the lock screen; labels already translated. */
export const LivePendingSchema = z.object({
  requestId: z.string(),
  tool: z.string(),
  allow: z.string(),
  deny: z.string(),
})
export type LivePending = z.infer<typeof LivePendingSchema>

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
  /** Glyphs of the last five steps, newest first (`⌘` command, `✎` edit, `⌕` search, `⇄` web, `⌥` subagent, `?` permission, `·` other). */
  glyphs: z.array(z.string()).default([]),
  /** The tool permission the session waits for, with its translated button labels; `null` otherwise. */
  pending: LivePendingSchema.nullable().default(null),
  /** Short translated line: "total" when done, "transcript kept · resume from the app" when closed. */
  hint: z.string().default(''),
  /** Translated count of tasks running in parallel (background tasks and running subagents), empty when none. */
  tasks: z.string().default(''),
  /** Theme colors of the app that registered; absent from older daemons (the widget uses dark). */
  palette: LivePaletteSchema.optional(),
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

/** A recent directory of a profile, with the branch of its latest session and the sessions used there this week. */
export const ProjectItemSchema = z.object({
  cwd: z.string(),
  lastUsedAt: z.string(),
  branch: z.string().nullable().default(null),
  sessions: z.number().int().nonnegative().default(0),
})
export type ProjectItem = z.infer<typeof ProjectItemSchema>

/** A subdirectory listed by `directories.list`; `git` when it holds a `.git` directory or file. */
export const DirectoryItemSchema = z.object({ name: z.string(), path: z.string(), git: z.boolean() })
export type DirectoryItem = z.infer<typeof DirectoryItemSchema>
/** Default and maximum number of items in `directories.results`. */
export const DIRECTORY_LIST_LIMIT = 200
export const MAX_DIRECTORY_LIST_LIMIT = 500

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

/** How `session.input` is delivered: right away, held in the queue, or held only while the session is busy. */
export const InputModeSchema = z.enum(['now', 'queue', 'auto'])
export type InputMode = z.infer<typeof InputModeSchema>
export const InputDeliverySchema = z.enum(['sent', 'queued'])
export type InputDelivery = z.infer<typeof InputDeliverySchema>

/** A prompt waiting for the session to be free; delivered in order once the turn ends. */
export const QueuedMessageSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  text: z.string(),
  attachmentIds: z.array(z.string()).default([]),
  createdAt: z.string(),
  /** Why the last delivery failed; the prompt then waits for the user (edit, send now, remove). */
  error: z.string().nullable().default(null),
})
export type QueuedMessage = z.infer<typeof QueuedMessageSchema>
/** Queued prompts per session. */
export const MAX_QUEUE = 20
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

/** A request the daemon rejected, for `diagnostics.result`: never its payload or message. */
export const RejectedRequestSchema = z.object({
  at: z.string(),
  type: z.string().max(64),
  code: ErrorCodeSchema,
})
export type RejectedRequest = z.infer<typeof RejectedRequestSchema>
/** How many rejections the daemon keeps for `diagnostics.errors`. */
export const DIAGNOSTICS_LIMIT = 50

/** Branches the daemon's installer can follow: `main` (stable) or `development`. */
export const DaemonUpdateChannelSchema = z.enum(['main', 'development'])
export type DaemonUpdateChannel = z.infer<typeof DaemonUpdateChannelSchema>

/** Steps of a daemon update run; `done` and `failed` are final. */
export const DaemonUpdateStepSchema = z.enum(['fetching', 'building', 'restarting', 'done', 'failed'])
export type DaemonUpdateStep = z.infer<typeof DaemonUpdateStepSchema>

/** One `remote-harness update` run, wherever it was started (app, tray, terminal). */
export const DaemonUpdateRunSchema = z.object({
  channel: DaemonUpdateChannelSchema,
  /** Version that was running when the run started. */
  from: z.string(),
  /** Version installed (known once fetched; the running one when done). */
  to: z.string().nullable(),
  commit: z.string().nullable(),
  step: DaemonUpdateStepSchema,
  error: z.string().optional(),
  /** The build failed and the previous version was rebuilt. */
  rolledBack: z.boolean().optional(),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
})
export type DaemonUpdateRun = z.infer<typeof DaemonUpdateRunSchema>

/** Why this daemon cannot update itself: run from sources, a development clone, no service manager. */
export const DaemonUpdateBlockerSchema = z.enum(['not-built', 'not-installer', 'no-service'])
export type DaemonUpdateBlocker = z.infer<typeof DaemonUpdateBlockerSchema>

export const DaemonUpdateInfoSchema = z.object({
  current: z.string(),
  channel: DaemonUpdateChannelSchema,
  checkedAt: z.string().nullable(),
  checking: z.boolean(),
  available: z
    .object({ version: z.string().nullable(), commit: z.string(), downgrade: z.boolean() })
    .nullable(),
  blocked: DaemonUpdateBlockerSchema.nullable(),
  /** A session is running or waiting, or a permission is pending (the restart interrupts the app). */
  busy: z.boolean(),
  run: DaemonUpdateRunSchema.nullable(),
})
export type DaemonUpdateInfo = z.infer<typeof DaemonUpdateInfoSchema>
