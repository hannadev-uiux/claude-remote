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
export function summarizeTool(name: string, input: Input): string {
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
        return (
          str(input.pattern) &&
          `"${input.pattern}"${str(input.path) ? ` em ${basename(String(input.path))}` : ''}`
        )
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
        return Array.isArray(input.todos) ? `${input.todos.length} itens` : undefined
      case 'Skill':
        return str(input.skill) ?? str(input.command)
      default: {
        const first = Object.values(input).find((v) => typeof v === 'string') as string | undefined
        return first
      }
    }
  })()
  const label = name.startsWith('mcp__') ? name.split('__').slice(1).join(':') : name
  return arg ? `${label}(${short(arg)})` : label
}
