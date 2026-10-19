import { createContext } from 'react'
import type { AgentId } from '@/core/theme/agents'

/** The agent of the conversation being shown, so entries can take its color without new props. */
export const ConversationAgent = createContext<AgentId | null>(null)
