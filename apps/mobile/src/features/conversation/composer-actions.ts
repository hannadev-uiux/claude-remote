export type ComposerState = {
  hasText: boolean
  hasAttachments: boolean
  /** Recording or transcribing: the mic must stay reachable to stop it. */
  voiceActive: boolean
  sending: boolean
  /** Whether the attach and mic buttons exist in this composer. */
  hasAttach: boolean
  hasVoice: boolean
}

export type ComposerActions = { attach: boolean; voice: boolean; send: boolean }

/** Which action buttons to render: attach/mic while empty, Send once there is something to send. */
export function composerActions(state: ComposerState): ComposerActions {
  const hasContent = state.hasText || state.hasAttachments
  return {
    send: state.sending || hasContent || (!state.hasAttach && !state.hasVoice),
    voice: state.hasVoice && (state.voiceActive || !hasContent),
    attach: state.hasAttach && !state.hasText,
  }
}
