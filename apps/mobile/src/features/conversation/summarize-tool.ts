import type { TFunction } from '@/core/i18n/create'
import { patchFiles } from './patch'

type Input = Record<string, unknown>

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function basename(path: string): string {
  return path.split('/').filter(Boolean).at(-1) ?? path
}

function short(text: string, max = 60): string {
  const one = text.replace(/\s+/g, ' ').trim()
  return one.length > max ? `${one.slice(0, max - 1)}…` : one
}

/** One-line label for a tool call, in the style of the Claude Code TUI: `Bash(pnpm test)`. */
export function summarizeTool(name: string, input: Input, t: TFunction): string {
  const arg = (() => {
    switch (name) {
      case 'Bash':
        return str(input.command)
      case 'Read':
      case 'Edit':
      case 'MultiEdit':
      case 'Write':
      case 'NotebookEdit': {
        const path = str(input.file_path) ?? str(input.notebook_path)
        return path ? basename(path) : undefined
      }
      case 'Grep':
        if (!str(input.pattern)) return undefined
        return str(input.path)
          ? t('tools.grepIn', { pattern: `"${input.pattern}"`, path: basename(String(input.path)) })
          : `"${input.pattern}"`
      case 'Glob':
        return str(input.pattern)
      case 'Task':
      case 'Agent':
        return str(input.description) ?? str(input.subagent_type)
      case 'WebFetch':
        return str(input.url)
      case 'WebSearch':
        return str(input.query)
      case 'TodoWrite':
        return Array.isArray(input.todos) ? t('tools.todoItems', { count: input.todos.length }) : undefined
      case 'Skill':
        return str(input.skill) ?? str(input.command)
      // Codex: shell commands and patches.
      case 'exec':
        return str(input.command)
      case 'apply_patch': {
        const files = patchFiles(input).map(basename)
        return files.length > 0 ? files.join(', ') : undefined
      }
      case 'web_search':
        return str(input.query)
      default: {
        const first = Object.values(input).find((v) => typeof v === 'string') as string | undefined
        return first
      }
    }
  })()
  const label = name.startsWith('mcp__') ? name.split('__').slice(1).join(':') : name
  return arg ? `${label}(${short(arg)})` : label
}
