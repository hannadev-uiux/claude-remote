## Context

The session route composes the header (`headerActions` + `SessionMuteButton` + `ActionMenu`), an info row (profile name as text, folder, state pill, `ModeSelector`) and `StatusBar` (model · effort · ctx · limits as one text line) above `ConversationScreen`. `Messages.tsx` draws the assistant dot in `accentText`; `PermissionCard` shows a countdown to expiry; `PromptComposer` always says "message the agent…". The prototypes (`docs/design/identity/screens/conversation-permission.html`, `conversation-queue.html`) fix the layout and copy.

## Decisions

- **Agent color through a context.** `ConversationScreen` resolves the agent once (`sessionAgent(session)` from the sessions store) and provides it with `ConversationAgent` (React context); `AssistantMessage` reads it, so the module-level item renderer and the subagent view need no new props. Until #108 the agent is Claude Code, so the dot is the Claude color; the user `>` stays in the accent.
- **The status bar becomes context line 2.** `StatusBar` keeps its data and its sheet but renders the model (with the effort) as an outlined chip, an optional dashed provider chip (`provider` prop, left `null` until #109 carries it), the branch from `session.checkout` and then the gauges; it hides when none of them is known. `modelLabel(status)` is the pure piece.
- **Elapsed, not countdown.** `permissionTimer(createdAt, expiresAt, now)` returns the elapsed time and an `urgent` flag (under 30 s left); the card shows `formatElapsed(elapsed)` and turns it red when urgent, like the waiting strip. `useNow(1000)` drives it.
- **Composer placeholder** comes from `composerPlaceholder(agent, disabled, t)` (pure, tested); `SmartComposer` resolves the agent from the sessions store and passes it to `PromptComposer`.
- **Terminal in the header.** An `IconButton` next to the bell, disabled (not hidden) in read-only sessions so the header keeps its shape; the menu keeps "View terminal" for discoverability and keyboard users.
- **Context line 1** reuses `AgentBadge` (18 pt) and `ProfileTag`; the folder stays a button to the session details and `ModeSelector` is unchanged (its outline already follows the mode's tone).
