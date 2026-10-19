## 1. Layout

- [x] 1.1 `getLayoutClass` (700 / 1100), `sidebarMode`, `inspectorMode`, `useLayout` with tests; `MasterDetailLayout` with inline / overlay sidebar and inspector panes
- [x] 1.2 `InspectorPane` (Terminal, Subagents with count, Details; resizable 280–420) with `useInspectorStore` and `clampInspectorWidth`; `SubagentRows` and `SessionDetailsList` extracted from the sheets; `(main)/_layout` composing classes, overlay sidebar with ☰, inspector column or side sheet; inspector button in the session header on two columns

## 2. Keyboard

- [x] 2.1 `keyboardHints` and `hardwareKeyboard` (pure, tested); `KeyboardHints` row under the composer and Return-to-send on tablets with a hardware keyboard
- [x] 2.2 `useSessionShortcuts` (⌘1–9, ⌘K, ⌘T, ⌘., ⌘⇧M, ⌘A / ⌘D) with `cycleMode` / `nthSessionId` tested; search focus request; i18n pt-BR, en-US, es-ES

## 3. Verification

- [x] 3.1 `pnpm check` green; `npx expo export --platform ios` bundles
