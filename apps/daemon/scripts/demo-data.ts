/**
 * Fictional data for the screenshot demo (`pnpm --filter @remote-harness/daemon demo`): profiles,
 * repositories, Claude Code transcripts, status lines and the terminal each pane shows. Pure: the
 * script in `demo.mts` writes it to disk and drives the real daemon with it.
 */
import { join } from 'node:path'

export const DEMO_HOST_NAME = 'studio'
export const DEMO_WS_PORT = 7437
export const DEMO_HOOK_PORT = 7438
export const DEMO_TMUX_SESSION = 'claude-remote'

export type DemoState = 'waiting' | 'running' | 'idle' | 'ended'

export type DemoRepo = { name: string; branches: string[]; worktrees: { name: string; branch: string }[] }

export type DemoEntry =
  | { kind: 'user'; text: string }
  | { kind: 'thinking'; text: string }
  | { kind: 'text'; text: string }
  | { kind: 'tool'; name: string; input: Record<string, unknown>; result?: string; error?: boolean }

export type DemoSession = {
  id: string
  profileId: string
  /** Repository name under `~/code`, plus the worktree name when the session works in one. */
  repo: string
  worktree?: string
  branch: string
  title: string
  state: DemoState
  /** Last activity, in minutes before the demo starts. */
  minutesAgo: number
  permissionMode: 'default' | 'acceptEdits' | 'plan'
  entries: DemoEntry[]
  /** The tool call waiting for an answer (the last `tool` entry, without a result). */
  permission?: { toolName: string; input: Record<string, unknown> }
  status?: DemoStatus
}

export type DemoStatus = {
  model: { id: string; display_name: string }
  effort: string
  contextUsed: number
  contextSize: number
  fiveHour: number
  sevenDay: number
}

/** Folders the demo creates directly under its root; nothing else is written outside them. */
export function demoLayout(root: string) {
  const home = join(root, '.remote-harness-demo')
  return {
    root,
    home,
    tmuxDir: join(home, 'tmux'),
    panesDir: join(home, 'panes'),
    code: join(root, 'code'),
    configDirs: {
      personal: join(root, '.claude'),
      work: join(root, '.claude-work'),
      openrouter: join(root, '.claude-openrouter'),
      codex: join(root, '.codex'),
    },
    /** Top-level paths the manifest lists and `--clean` removes. */
    owned: [
      home,
      join(root, 'code'),
      join(root, '.claude'),
      join(root, '.claude-work'),
      join(root, '.claude-openrouter'),
      join(root, '.codex'),
    ],
  }
}

export type DemoLayout = ReturnType<typeof demoLayout>

/** Paths the demo would create that already exist and are not its own (from an earlier run). */
export function conflictingPaths(
  owned: readonly string[],
  manifest: readonly string[],
  exists: (path: string) => boolean,
): string[] {
  const mine = new Set(manifest)
  return owned.filter((path) => exists(path) && !mine.has(path))
}

export function demoConfig() {
  return {
    profiles: [
      { id: 'personal', name: 'Personal', configDir: '~/.claude', color: '#D97757' },
      { id: 'work', name: 'Work', configDir: '~/.claude-work', color: '#61AFEF' },
      {
        id: 'openrouter',
        name: 'OpenRouter',
        configDir: '~/.claude-openrouter',
        color: '#8A8784',
        provider: { kind: 'openrouter', model: 'anthropic/claude-sonnet-5.5' },
      },
      { id: 'codex', name: 'Codex', configDir: '~/.codex', color: '#2FBF8F', agent: 'codex' },
    ],
    wsPort: DEMO_WS_PORT,
    hookPort: DEMO_HOOK_PORT,
    tmuxSession: DEMO_TMUX_SESSION,
    // Long enough to take every screenshot of the pending request.
    permissionTimeoutSec: 3000,
    push: 'off',
    tray: false,
    keepAwake: 'off',
    language: 'en-US',
  }
}

export const DEMO_REPOS: DemoRepo[] = [
  { name: 'acme-api', branches: ['main'], worktrees: [{ name: 'rate-limit', branch: 'feat/rate-limit' }] },
  { name: 'acme-web', branches: ['main', 'feat/dark-mode'], worktrees: [] },
  { name: 'blog', branches: ['main'], worktrees: [] },
  {
    name: 'infra',
    branches: ['main'],
    worktrees: [{ name: 'terraform-1-9', branch: 'chore/terraform-1.9' }],
  },
  { name: 'design-system', branches: ['main'], worktrees: [] },
]

const OPUS = { id: 'claude-opus-5-5', display_name: 'Opus 5.5' }

export const DEMO_SESSIONS: DemoSession[] = [
  {
    id: '6f1c2a0e-1b7d-4c55-9a8e-0d3f5b2c9a11',
    profileId: 'personal',
    repo: 'acme-api',
    worktree: 'rate-limit',
    branch: 'feat/rate-limit',
    title: 'Rate limit the login endpoint',
    state: 'waiting',
    minutesAgo: 0,
    permissionMode: 'default',
    status: {
      model: { id: 'claude-sonnet-5-5', display_name: 'Sonnet 5.5' },
      effort: 'medium',
      contextUsed: 61,
      contextSize: 200_000,
      fiveHour: 23,
      sevenDay: 41,
    },
    entries: [
      {
        kind: 'user',
        text: 'The login endpoint returns 500 under load. Find out why and add rate limiting per IP.',
      },
      {
        kind: 'thinking',
        text: 'A 500 under load usually means the session store runs out of connections. I will check the pool size first, then add a limiter in front of the route.',
      },
      { kind: 'text', text: "I'll start with the route and the database pool." },
      {
        kind: 'tool',
        name: 'Grep',
        input: { pattern: 'createPool', path: 'src' },
        result: 'src/db/pool.ts:4:export const pool = createPool({ max: 5 })',
      },
      {
        kind: 'text',
        text: 'The pool allows only **5** connections, and every login opens two. That is the 500. I added a per-IP limiter and raised the pool to 20.',
      },
      {
        kind: 'tool',
        name: 'Edit',
        input: {
          file_path: 'src/routes/login.ts',
          old_string: "router.post('/login', login)",
          new_string: "router.post('/login', rateLimit({ window: '1m', max: 10, key: ip }), login)",
        },
        result: 'The file src/routes/login.ts has been updated.',
      },
      { kind: 'text', text: 'Now the tests for the login route.' },
      {
        kind: 'tool',
        name: 'Bash',
        input: { command: 'pnpm --filter api test -- login', description: 'Run the login route tests' },
      },
    ],
    permission: {
      toolName: 'Bash',
      input: { command: 'pnpm --filter api test -- login', description: 'Run the login route tests' },
    },
  },
  {
    id: '2b9d7e41-5c3a-4f0e-8d21-7a6b4c1e0f22',
    profileId: 'work',
    repo: 'acme-web',
    branch: 'feat/dark-mode',
    title: 'Dark mode toggle in settings',
    state: 'running',
    minutesAgo: 0,
    permissionMode: 'acceptEdits',
    status: {
      model: OPUS,
      effort: 'high',
      contextUsed: 38,
      contextSize: 200_000,
      fiveHour: 23,
      sevenDay: 41,
    },
    entries: [
      {
        kind: 'user',
        text: "Add a dark mode toggle to the settings page. Keep the user's choice across reloads.",
      },
      {
        kind: 'thinking',
        text: 'The settings page lives in src/routes/settings.tsx and the theme tokens in src/theme.ts. I will store the choice in localStorage and read it before the first paint.',
      },
      { kind: 'text', text: "I'll look at how the theme is applied first." },
      {
        kind: 'tool',
        name: 'Grep',
        input: { pattern: 'useTheme', path: 'src' },
        result: 'src/theme.ts\nsrc/routes/settings.tsx\nsrc/main.tsx',
      },
      {
        kind: 'tool',
        name: 'Edit',
        input: {
          file_path: 'src/routes/settings.tsx',
          old_string: '<Section title="Appearance">\n  <FontSize />',
          new_string:
            '<Section title="Appearance">\n  <ThemeToggle value={theme} onChange={setTheme} />\n  <FontSize />',
        },
        result: 'The file src/routes/settings.tsx has been updated.',
      },
      {
        kind: 'tool',
        name: 'Edit',
        input: {
          file_path: 'src/theme.ts',
          old_string: "export const initialTheme = 'light'",
          new_string: "export const initialTheme = localStorage.getItem('theme') ?? 'light'",
        },
        result: 'The file src/theme.ts has been updated.',
      },
      {
        kind: 'tool',
        name: 'Bash',
        input: { command: 'pnpm test settings', description: 'Run the settings tests' },
        result:
          ' ✓ src/routes/settings.test.tsx (6 tests) 41ms\n\n Test Files  1 passed (1)\n      Tests  6 passed (6)',
      },
      {
        kind: 'text',
        text: 'Done. The toggle sits at the top of **Appearance**:\n\n- `settings.tsx` renders `<ThemeToggle>` bound to the current theme.\n- `theme.ts` reads the saved choice before the first paint, so there is no flash.\n\nAll 6 settings tests pass.',
      },
      { kind: 'user', text: 'Also follow the system setting until the user picks one.' },
      {
        kind: 'thinking',
        text: "`matchMedia('(prefers-color-scheme: dark)')` gives the system setting; the saved choice wins once there is one.",
      },
    ],
  },
  {
    id: '9a4e3c12-7d6b-4e8f-a1c0-3b2d5f7e8a33',
    profileId: 'personal',
    repo: 'acme-api',
    branch: 'main',
    title: 'Fix the flaky checkout test',
    state: 'idle',
    minutesAgo: 24,
    permissionMode: 'default',
    entries: [
      { kind: 'user', text: 'checkout.test.ts fails about once in ten runs on CI. Make it deterministic.' },
      {
        kind: 'tool',
        name: 'Bash',
        input: { command: 'pnpm test checkout --repeat 20', description: 'Repeat the checkout tests' },
        result: ' ✓ test/checkout.test.ts (12 tests) × 20\n\n Tests  240 passed (240)',
      },
      {
        kind: 'text',
        text: 'The test depended on the wall clock. It now uses a fixed clock, and 20 repeated runs pass.',
      },
    ],
  },
  {
    id: '4c7b1d93-2e5f-4a6c-9b08-1f3e6d2a7c44',
    profileId: 'openrouter',
    repo: 'design-system',
    branch: 'main',
    title: 'Audit the button contrast',
    state: 'idle',
    minutesAgo: 75,
    permissionMode: 'plan',
    entries: [
      { kind: 'user', text: 'Check every button variant against WCAG AA and list the ones that fail.' },
      {
        kind: 'text',
        text: 'Two variants fail AA on the dark theme: `ghost` (3.1:1) and `link` (3.8:1). Plan: darken their text token one step.',
      },
    ],
  },
  {
    id: '7e2f9b05-8c1d-4d3a-b6e7-5a0c2f9d1e55',
    profileId: 'personal',
    repo: 'blog',
    branch: 'main',
    title: 'Draft the v2 launch post',
    state: 'idle',
    minutesAgo: 190,
    permissionMode: 'default',
    entries: [
      { kind: 'user', text: 'Draft a short launch post for v2 from CHANGELOG.md.' },
      {
        kind: 'text',
        text: 'Draft saved to `posts/v2-launch.md`: three sections (what changed, how to upgrade, thanks).',
      },
    ],
  },
  {
    id: '1d8a6f27-3b9e-4c2d-8f15-6e4a0b3c7d66',
    profileId: 'work',
    repo: 'infra',
    worktree: 'terraform-1-9',
    branch: 'chore/terraform-1.9',
    title: 'Upgrade the Terraform providers',
    state: 'ended',
    minutesAgo: 26 * 60,
    permissionMode: 'default',
    entries: [
      { kind: 'user', text: 'Upgrade the AWS and Cloudflare providers and fix what breaks.' },
      { kind: 'text', text: 'Both providers are upgraded; `terraform plan` shows no changes.' },
    ],
  },
]

/** Where a session works: the repository, or its worktree. */
export function sessionCwd(code: string, session: Pick<DemoSession, 'repo' | 'worktree'>): string {
  const repo = join(code, session.repo)
  return session.worktree ? join(repo, '.claude', 'worktrees', session.worktree) : repo
}

/** Claude Code's folder name for a project: every character other than a letter or digit becomes `-`. */
export function projectDirName(cwd: string): string {
  return cwd.replace(/[^a-zA-Z0-9]/g, '-')
}

/** The session's transcript, as Claude Code writes it (one JSON object per line), oldest first. */
export function transcriptLines(session: DemoSession, cwd: string, now: number): string[] {
  const end = now - session.minutesAgo * 60_000
  // Entries 20 s apart, ending at the last activity.
  const at = (i: number) => new Date(end - (session.entries.length - 1 - i) * 20_000).toISOString()
  const base = { isSidechain: false, cwd, sessionId: session.id, gitBranch: session.branch }
  const lines: object[] = [
    { type: 'custom-title', customTitle: session.title, sessionId: session.id },
    { type: 'permission-mode', permissionMode: session.permissionMode, sessionId: session.id },
  ]
  let parent: string | null = null
  session.entries.forEach((entry, i) => {
    const uuid = `${session.id.slice(0, 8)}-e${i}`
    const common = { ...base, parentUuid: parent, uuid, timestamp: at(i) }
    const message = `msg-${session.id.slice(0, 8)}-${i}`
    switch (entry.kind) {
      case 'user':
        lines.push({ ...common, type: 'user', message: { role: 'user', content: entry.text } })
        break
      case 'thinking':
        lines.push({
          ...common,
          type: 'assistant',
          message: { id: message, role: 'assistant', content: [{ type: 'thinking', thinking: entry.text }] },
        })
        break
      case 'text':
        lines.push({
          ...common,
          type: 'assistant',
          message: { id: message, role: 'assistant', content: [{ type: 'text', text: entry.text }] },
        })
        break
      case 'tool': {
        const toolId = `toolu_${session.id.slice(0, 8)}_${i}`
        const input = entry.input.file_path
          ? { ...entry.input, file_path: join(cwd, String(entry.input.file_path)) }
          : entry.input
        lines.push({
          ...common,
          type: 'assistant',
          message: {
            id: message,
            role: 'assistant',
            content: [{ type: 'tool_use', id: toolId, name: entry.name, input }],
          },
        })
        if (entry.result !== undefined) {
          const resultUuid = `${uuid}-r`
          lines.push({
            ...base,
            parentUuid: uuid,
            uuid: resultUuid,
            timestamp: at(i),
            type: 'user',
            message: {
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: toolId,
                  content: entry.result,
                  is_error: entry.error ?? false,
                },
              ],
            },
          })
          parent = resultUuid
          return
        }
        break
      }
    }
    parent = uuid
  })
  return lines.map((line) => JSON.stringify(line))
}

/** The `/statusline` body the wrapper would post for the session. */
export function statusLineBody(session: DemoSession, transcriptPath: string, now: number) {
  const status = session.status
  if (!status) return null
  const resets = (hours: number) => Math.round(now / 1000 + hours * 3600)
  return {
    session_id: session.id,
    transcript_path: transcriptPath,
    model: status.model,
    effort: { level: status.effort },
    context_window: {
      context_window_size: status.contextSize,
      total_input_tokens: Math.round((status.contextSize * status.contextUsed) / 100),
      used_percentage: status.contextUsed,
    },
    rate_limits: {
      five_hour: { used_percentage: status.fiveHour, resets_at: resets(3.2) },
      seven_day: { used_percentage: status.sevenDay, resets_at: resets(80) },
    },
  }
}

const RESET = '\x1b[0m'
const DIM = '\x1b[2m'
const BOLD = '\x1b[1m'
const AMBER = '\x1b[38;5;215m'
const GREEN = '\x1b[32m'
const RED = '\x1b[31m'

function firstLine(text: string): string {
  return text.split('\n')[0] ?? ''
}

function toolLabel(entry: Extract<DemoEntry, { kind: 'tool' }>): string {
  const input = entry.input
  if (entry.name === 'Bash') return `Bash(${String(input.command)})`
  if (entry.name === 'Edit') return `Update(${String(input.file_path)})`
  if (entry.name === 'Grep')
    return `Search(pattern: "${String(input.pattern)}", path: "${String(input.path)}")`
  return entry.name
}

/** What the session's tmux pane shows: a terminal close to the agent's own, ending in its prompt box. */
export function paneText(session: DemoSession, width = 60): string {
  const out: string[] = ['']
  for (const entry of session.entries) {
    if (entry.kind === 'user') out.push(`${DIM}>${RESET} ${entry.text}`, '')
    if (entry.kind === 'text') out.push(`${BOLD}●${RESET} ${firstLine(entry.text).replaceAll('**', '')}`, '')
    if (entry.kind === 'tool') {
      out.push(`${AMBER}●${RESET} ${BOLD}${toolLabel(entry)}${RESET}`)
      if (entry.result !== undefined) {
        out.push(`  ${DIM}⎿${RESET}  ${entry.error ? RED : ''}${firstLine(entry.result).trim()}${RESET}`)
      }
      if (entry.name === 'Edit') {
        const before = String(entry.input.old_string).split('\n')
        const after = String(entry.input.new_string).split('\n')
        for (const line of before.filter((l) => !after.includes(l)))
          out.push(`     ${RED}- ${line.trim()}${RESET}`)
        for (const line of after.filter((l) => !before.includes(l)))
          out.push(`     ${GREEN}+ ${line.trim()}${RESET}`)
      }
      out.push('')
    }
  }
  if (session.state === 'running')
    out.push(`${AMBER}✶${RESET} Thinking… ${DIM}(12s · esc to interrupt)${RESET}`, '')
  if (session.permission) {
    out.push(
      `${AMBER}Do you want to proceed?${RESET}`,
      `${BOLD}❯ 1. Yes${RESET}`,
      "  2. Yes, and don't ask again for this command",
      '  3. No, and tell the agent what to do differently',
      '',
    )
  }
  const rule = '─'.repeat(width - 2)
  out.push(`╭${rule}╮`, `│ >${' '.repeat(width - 4)}│`, `╰${rule}╯`)
  const mode =
    session.permissionMode === 'acceptEdits'
      ? '⏵⏵ accept edits on (shift+tab to cycle)'
      : session.permissionMode === 'plan'
        ? '⏸ plan mode on (shift+tab to cycle)'
        : '? for shortcuts'
  out.push(`  ${DIM}${mode}${RESET}`)
  return `${out.join('\n')}\n`
}
