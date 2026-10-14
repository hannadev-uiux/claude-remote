/** Helpers for Claude Code permission rule strings such as `Bash(pnpm test:*)`. */

export type ParsedRule = { toolName: string; ruleContent?: string }

export function parseRule(rule: string): ParsedRule | null {
  const match = /^([^()\s]+)(?:\(([\s\S]*)\))?$/.exec(rule.trim())
  if (!match?.[1]) return null
  return match[2] === undefined || match[2] === ''
    ? { toolName: match[1] }
    : { toolName: match[1], ruleContent: match[2] }
}

export function formatRule(rule: ParsedRule): string {
  return rule.ruleContent ? `${rule.toolName}(${rule.ruleContent})` : rule.toolName
}

const SUBCOMMAND = /^[a-z][\w:.-]*$/i

/** Builds a reasonably narrow prefix rule for a Bash command: `Bash(git commit:*)`, `Bash(ls:*)`. */
export function bashPrefixRule(command: string): string {
  const firstSegment = command.split(/&&|\|\||[;|\n]/)[0]?.trim() ?? ''
  const tokens = firstSegment.split(/\s+/).filter((t) => t && !/^\w+=/.test(t))
  const [first, second] = tokens
  if (!first) return 'Bash'
  return second && SUBCOMMAND.test(second) ? `Bash(${first} ${second}:*)` : `Bash(${first}:*)`
}

type Suggestion = { type?: unknown; rules?: unknown; behavior?: unknown }

/** Picks the rule Claude Code itself suggested, or derives one from the tool call. */
export function suggestRule(
  tool: string,
  input: Record<string, unknown>,
  suggestions: unknown,
): string | null {
  if (Array.isArray(suggestions)) {
    for (const s of suggestions as Suggestion[]) {
      if (
        s?.type !== 'addRules' ||
        (s.behavior !== undefined && s.behavior !== 'allow') ||
        !Array.isArray(s.rules)
      )
        continue
      const first = s.rules[0] as { toolName?: unknown; ruleContent?: unknown } | undefined
      if (first && typeof first.toolName === 'string') {
        return formatRule({
          toolName: first.toolName,
          ruleContent: typeof first.ruleContent === 'string' ? first.ruleContent : undefined,
        })
      }
    }
  }
  if (tool === 'Bash' && typeof input.command === 'string') return bashPrefixRule(input.command)
  if (tool === 'WebFetch' && typeof input.url === 'string') {
    try {
      return `WebFetch(domain:${new URL(input.url).hostname})`
    } catch {
      return 'WebFetch'
    }
  }
  return tool || null
}
