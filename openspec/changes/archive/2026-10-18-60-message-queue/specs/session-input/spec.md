## ADDED Requirements

### Requirement: Message queue
`session.input` SHALL carry a delivery `mode`: `now` (the default: paste and submit right away, as before), `queue` (hold the prompt) or `auto` (hold it while the session is busy, that is `running`, `waiting`, with a permission pending or with prompts already queued; otherwise deliver right away). The reply SHALL say whether the prompt was `sent` or `queued`. Queued prompts (text and attachment ids) SHALL be kept per session in the daemon, in order, persisted atomically so they survive a restart, broadcast as `session.queue` on every change and replayed to clients that connect later. When a session is `idle`, controllable and has no permission pending, the daemon SHALL deliver the first queued prompt after a short settle and then wait for that turn (the prompt registered, then the session idle again) before delivering the next one. A delivery that fails SHALL keep the prompt at the head with the error and stop automatic delivery for that session until the user edits it, sends it now or removes it. `queue.update`, `queue.remove`, `queue.sendNow` (deliver one prompt immediately, even mid-turn) and `queue.flush` (deliver every queued prompt immediately, in order, stopping at the first error) SHALL act on the queue; a prompt that `sendNow` cannot deliver goes back to the head with the error. The queue of a session SHALL be cleared when the session ends or loses its pane. A session's queue SHALL hold at most 20 prompts; queueing into a read-only session MUST be rejected with `not_controllable`, an empty prompt with `bad_request`.

#### Scenario: Queued while working
- **WHEN** the app sends "also update the README" with `mode: auto` to a `running` session
- **THEN** the daemon answers `queued`, nothing is pasted, and every client receives `session.queue` with the prompt

#### Scenario: Delivered after the turn
- **WHEN** the session's `Stop` hook arrives and no permission is pending
- **THEN** the daemon pastes the first queued prompt, presses Enter, and the next one waits until that turn ends

#### Scenario: Permission pending
- **WHEN** the session is `idle` but a permission request is still waiting for an answer
- **THEN** no queued prompt is delivered until the request is resolved

#### Scenario: Failed delivery
- **WHEN** pasting the head prompt fails because its attachment expired
- **THEN** the prompt stays first with the error, the clients see it, and the daemon delivers nothing else from that queue until the user edits, sends or removes it

#### Scenario: Send now
- **WHEN** the user picks "Send now" on a queued prompt while the session is `running`
- **THEN** the daemon pastes it immediately and removes it from the queue

#### Scenario: Restart
- **WHEN** the daemon restarts with two prompts queued for a live session
- **THEN** both are still queued afterwards and are delivered when the session turns idle
