## 1. Logic

- [x] 1.1 `tool-details.ts`: input fields per tool, raw JSON, text cut, tool type and tab choice/memory, with Vitest tests
- [x] 1.2 `tool-tab-store.ts` persisted in SecureStore and restored at app start

## 2. UI

- [x] 2.1 `ToolCallCard` with Output / Input / JSON tabs and "Show more"
- [x] 2.2 Tab names, field labels and "Show more" in pt-BR, en-US and es-ES

## 3. Verification

- [x] 3.1 `pnpm check` green (mobile 214 tests; Biome run on the changed paths), `npx expo export --platform ios` bundles
