## 1. Protocol

- [x] 1.1 `SubagentInfo.outcome` (optional `failed` | `stopped`), with a test.

## 2. Daemon

- [x] 2.1 `subagentOutcome` and `subagentPromptLine` in the transcript parser (tests).
- [x] 2.2 Tracker: blank names to `null`, meta re-read while incomplete, prompt fallback, outcome checks after `SubagentStop` (tests).

## 3. App

- [x] 3.1 `subagentLabel` (never blank) and `subagentStatus` (tests).
- [x] 3.2 Rows (sheet, inspector) and nested list with the semantic badges and the agent type line; i18n in pt-BR, en-US and es-ES.

## 4. Validation

- [x] 4.1 `pnpm check` green and `npx expo export --platform ios` bundles.
