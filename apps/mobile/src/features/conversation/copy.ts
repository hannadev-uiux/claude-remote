import type { TranscriptEntry } from '@remote-harness/protocol'
import { isValidElement, type ReactNode } from 'react'
import { type ToolTab, toolCallJson } from './tool-details'

type Use = Extract<TranscriptEntry, { kind: 'tool_use' }>
type Result = Extract<TranscriptEntry, { kind: 'tool_result' }>

/** What the Copy button of a tool call tab copies; Input copies field by field instead. */
export function toolTabCopyText(tab: ToolTab, use: Use | null, result: Result | null): string | null {
  if (tab === 'json') return toolCallJson(use, result)
  if (tab === 'output') return result?.content.trim() ? result.content : null
  return null
}

/** Language shown in a code block header: the first word of the fence info (`ts title=x` → `ts`). */
export function codeLabel(language: string | undefined): string | null {
  return language?.trim().split(/\s+/)[0] || null
}

/** Text of a rendered tree, for copying a whole block that is not natively selectable. */
export function plainText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(plainText).join('')
  if (!isValidElement(node)) return ''
  return plainText((node.props as { children?: ReactNode }).children)
}
