# 60 · Message queue with "send now"

## Why

A prompt sent from the phone while the session is working is pasted into the TUI and submitted at once (`InputService.sendText`). The app cannot tell whether the agent queued it, read it mid-turn or mixed it with what the TUI was showing, and there is no way to line up follow-ups, review or cancel them, or choose explicitly to send mid-turn. #110 (epic #162) gives sessions a queue that lives in the daemon, delivered in order when each turn ends, with an explicit "send now" like Claude Code's Ctrl+Enter.

## What Changes

- **Protocol**: `session.input` gains `mode` (`now` default, `queue`, `auto`) and its `ack` says whether the prompt was `sent` or `queued`; new client messages `queue.update`, `queue.remove`, `queue.sendNow`, `queue.flush`; new server message `session.queue` (the session's queued prompts, broadcast on every change and replayed on connect); `QueuedMessage` in the domain.
- **Daemon** `features/queue/`: holds queued prompts per session (text and attachment ids), persisted atomically in `queue.json`; delivers the head when the session turns `idle` with no permission pending, after a short settle, then waits for that turn before the next one; a failed delivery keeps the prompt with its error and stops automatic delivery until the user acts; the queue is cleared when the session ends. `session.input` moves from the input feature to the queue feature, which owns the delivery policy.
- **App**: Send uses `auto` (queues while the session is busy, clears the field either way); long press on Send and ⌘⏎ send now; a `Hold: send now · ⌘⏎` hint appears while the message would be queued. A dashed `QUEUED · N` card above the composer lists the prompts with edit / remove / send now and `Send all now`, and shows a failed delivery's error. Queue state mirrors `session.queue`.
- Copy in pt-BR, en-US and es-ES.

## Impact

- `packages/protocol/src/{domain,client,server}.ts` and tests.
- `apps/daemon`: `features/queue/{queue,service,index}.ts`, `features/input/index.ts`, `core/paths.ts`, `main.ts`, `test/queue.test.ts`.
- `apps/mobile`: `features/queue/{store,logic,components/QueueCard}.tsx`, `features/conversation/{use-prompt,components/PromptComposer}.tsx`, `features/autocomplete/SmartComposer.tsx`, `features/sync/use-daemon-sync.ts`, `app/(main)/session/[id]/index.tsx`, locales.
- Specs: `session-input` (ADDED Message queue), `protocol` (MODIFIED Message catalog), `app-conversation` (MODIFIED Prompt sending).
