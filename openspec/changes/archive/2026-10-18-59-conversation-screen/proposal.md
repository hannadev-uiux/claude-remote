# 59 · Conversation screen: context lines, agent-colored messages, agent-neutral permission card

## Why

The session screen still carries the pre-redesign header and info row: the profile name as plain text, no agent badge, the model and limits as a text line, assistant messages always in the accent, and a permission card whose timer counts down instead of showing how long the request has waited. #155 (epic #162) aligns it with the identity prototypes: two context lines, the agent's color on its messages, a neutral permission card and a composer that names the agent when it is known.

## What Changes

- **Header**: back · title · bell · terminal · `⋯` (accent dot while subagents run, #107). The terminal button opens the raw terminal and is disabled in read-only sessions; "View terminal" stays in the menu.
- **Context line 1**: agent badge · profile tag · folder (truncating) · state pill · mode chip.
- **Context line 2** (when anything is known): model chip (`sonnet-5.5 · high`), provider chip (`via …`, dashed; filled by #109), branch (`⎇`), then the context and limit gauges; tapping still opens the status sheet.
- **Messages**: the assistant's leading dot takes the agent color; user messages keep the accent `>`.
- **Permission card**: shield + `Tool(arguments)` + the time elapsed since the request (red when about to expire), the detail label, the argument box, Deny / Always / Allow. It never names the agent.
- **Composer**: placeholder `message Claude Code… (@ files, / commands)` when the agent is known, `message the agent…` otherwise; the send button is in the accent while there is text (unchanged). The long-press tooltip waits for #110.
- Key bar unchanged. Copy in pt-BR, en-US and es-ES.

## Impact

- `apps/mobile`: `app/(main)/session/[id]/index.tsx`, `features/conversation/{ConversationScreen.tsx,agent-context.ts,composer-placeholder.ts,components/Messages.tsx,components/PromptComposer.tsx}`, `features/autocomplete/SmartComposer.tsx`, `features/permissions/{describe.ts,components/PermissionCard.tsx}`, `features/session-status/{logic.ts,StatusBar.tsx}`, locales.
- Specs: `app-conversation` (ADDED Context line; MODIFIED Entry rendering, Prompt sending, Session options menu, Status bar), `app-permissions` (MODIFIED Permission card).
