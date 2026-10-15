## Context

Status line labels (Claude Code 2.1): "manual mode on" or no label (default), "accept edits on", "plan mode on", "auto mode on", "bypass permissions on", "don't ask on". The cycle varies by version and configuration.

## Goals / Non-Goals

**Goals:** never assume the order of the cycle.

**Non-Goals:** `dontAsk` (it is not in the cycle).

## Decisions

- **Pure detector** `detectMode(paneText)`: looks for the labels in the last 6 lines of the pane; no label → `default`.
- **Switch loop**: `send-keys BTab`, wait 150 ms, `capture-pane -p`, detect; repeat until the target or 6 attempts. If it lands on `bypassPermissions`, it sends one more BTab immediately.
- **Per-session mutex** shared with the input queue (change 07) so it does not interleave with prompts.

## Risks / Trade-offs

- [Label text changes] → label table in a single file with tests.
