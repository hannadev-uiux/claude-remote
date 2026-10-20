import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { CODEX_COMMANDS } from '../autocomplete/codex-commands.ts'
import { oneLine, readSlice } from '../sessions/transcript-meta.ts'
import {
  codexTranscript,
  extractCodexMeta,
  rolloutSessionId,
  threadName,
} from '../transcript/codex-format.ts'
import type { AgentAdapter, TranscriptLocation } from './types.ts'

const DAY_MS = 86_400_000
/** `session_meta` carries the base instructions (tens of KB) before the first prompt. */
const HEAD_BYTES = 192 * 1024
const TAIL_BYTES = 64 * 1024
const INDEX_TAIL_BYTES = 256 * 1024

async function entries(dir: string): Promise<string[]> {
  return readdir(dir).catch(() => [] as string[])
}

/**
 * Rollouts live in `sessions/YYYY/MM/DD/rollout-<local time>-<uuid>.jsonl`. Day folders older than the
 * cutoff (with a day of margin for time zones) are not even listed.
 */
async function findCodexTranscripts(configDir: string, cutoffMs: number): Promise<TranscriptLocation[]> {
  const root = join(configDir, 'sessions')
  const files: TranscriptLocation[] = []
  for (const year of await entries(root)) {
    if (!/^\d{4}$/.test(year)) continue
    for (const month of await entries(join(root, year))) {
      if (!/^\d{2}$/.test(month)) continue
      for (const day of await entries(join(root, year, month))) {
        if (!/^\d{2}$/.test(day)) continue
        const dayEnd = new Date(Number(year), Number(month) - 1, Number(day)).getTime() + 2 * DAY_MS
        if (dayEnd < cutoffMs) continue
        const dir = join(root, year, month, day)
        for (const name of await entries(dir)) {
          const sessionId = rolloutSessionId(name)
          if (!sessionId) continue
          const path = join(dir, name)
          try {
            const info = await stat(path)
            if (info.isFile() && info.mtimeMs >= cutoffMs) files.push({ sessionId, path, mtime: info.mtime })
          } catch {
            // removed while scanning
          }
        }
      }
    }
  }
  return files
}

function splitLines(text: string): string[] {
  return text.split('\n').filter((line) => line.startsWith('{'))
}

/** Title: the thread name given with `/rename` (session_index.jsonl), else the first prompt. */
async function readCodexSummary(path: string, configDir: string) {
  const [head, tail] = await Promise.all([
    readSlice(path, 'head', HEAD_BYTES),
    readSlice(path, 'tail', TAIL_BYTES),
  ])
  const meta = extractCodexMeta(splitLines(head), splitLines(tail))
  const index = meta.id
    ? await readSlice(join(configDir, 'session_index.jsonl'), 'tail', INDEX_TAIL_BYTES).catch(() => '')
    : ''
  const name = meta.id ? threadName(splitLines(index), meta.id) : null
  const title = name ?? meta.firstPrompt
  return {
    title: title ? oneLine(title) : null,
    cwd: meta.cwd,
    permissionMode: null,
    approvalPolicy: meta.approvalPolicy,
  }
}

/** OpenAI Codex CLI (read from codex 0.163). */
export const codex: AgentAdapter = {
  id: 'codex',
  name: 'Codex',
  command: 'codex',
  configDirEnv: 'CODEX_HOME',
  defaultConfigDir: '~/.codex',
  resumeArgs: (sessionId) => ['resume', sessionId],
  worktreeArgs: () => null,
  nameArgs: () => null,
  transcript: codexTranscript,
  findTranscripts: findCodexTranscripts,
  readSummary: readCodexSummary,
  commands: async () => CODEX_COMMANDS,
  commandsSignature: async () => 'builtin',
  // Typed bursts followed by Enter within 120 ms count as a paste in Codex: the Enter would be a newline.
  input: { minEnterDelayMs: 250, newline: { keys: ['C-j'] }, beforeSubmit: [] },
  hooks: { style: 'codex-hooks', file: (configDir) => join(configDir, 'hooks.json') },
  statusLine: false,
  providers: false,
  modes: false,
  permissionRules: false,
  polish: null,
}
