import { readdir, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { commandsSignature, loadCommands } from '../autocomplete/commands.ts'
import { readTranscriptMeta } from '../sessions/transcript-meta.ts'
import { claudeTranscript } from '../transcript/parser.ts'
import type { AgentAdapter, TranscriptLocation } from './types.ts'

const POLISH_SYSTEM_PROMPT =
  'Rewrite the given dictated text into a clean prompt: remove filler words, hesitations and ' +
  'repetitions, fix punctuation and grammar, and keep technical terms, file names and code exactly ' +
  'as said. Respond with only the rewritten text, nothing else.'

/** Main-session transcripts are `projects/<dir>/<id>.jsonl` (subagents live one level deeper). */
async function findClaudeTranscripts(configDir: string, cutoffMs: number): Promise<TranscriptLocation[]> {
  const projectsDir = join(configDir, 'projects')
  let projectDirs: string[]
  try {
    projectDirs = await readdir(projectsDir)
  } catch {
    return []
  }
  const files: TranscriptLocation[] = []
  for (const dir of projectDirs) {
    let names: string[]
    try {
      names = await readdir(join(projectsDir, dir))
    } catch {
      continue
    }
    for (const name of names) {
      if (!name.endsWith('.jsonl')) continue
      const path = join(projectsDir, dir, name)
      try {
        const info = await stat(path)
        if (info.isFile() && info.mtimeMs >= cutoffMs) {
          files.push({ sessionId: basename(name, '.jsonl'), path, mtime: info.mtime })
        }
      } catch {
        // removed while scanning
      }
    }
  }
  return files
}

/** Claude Code: the values the daemon used before adapters existed, byte for byte. */
export const claudeCode: AgentAdapter = {
  id: 'claude',
  name: 'Claude Code',
  command: 'claude',
  configDirEnv: 'CLAUDE_CONFIG_DIR',
  defaultConfigDir: '~/.claude',
  resumeArgs: (sessionId) => ['--resume', sessionId],
  worktreeArgs: (name) => ['--worktree', name],
  nameArgs: (name) => ['--name', name],
  transcript: claudeTranscript,
  findTranscripts: findClaudeTranscripts,
  readSummary: async (path) => ({ ...(await readTranscriptMeta(path)), approvalPolicy: null }),
  commands: loadCommands,
  commandsSignature,
  // Claude Code inserts a newline for backslash + Enter.
  input: { minEnterDelayMs: 0, newline: { literal: '\\', keys: ['Enter'] }, beforeSubmit: ['Escape'] },
  hooks: { style: 'claude-settings', file: (configDir) => join(configDir, 'settings.json') },
  statusLine: true,
  providers: true,
  modes: true,
  permissionRules: true,
  polish: {
    args: (text) => [
      '-p',
      text,
      '--model',
      'haiku',
      '--output-format',
      'json',
      '--allowedTools',
      '',
      '--append-system-prompt',
      POLISH_SYSTEM_PROMPT,
    ],
  },
}
