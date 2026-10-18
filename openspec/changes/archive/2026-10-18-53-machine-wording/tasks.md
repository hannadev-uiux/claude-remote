## 1. Machine name

- [x] 1.1 `core/i18n/machine.ts` (registry, `resolveMachineName`) and the top-level `missingInterpolationHandler` in `createI18n`; tests with real catalogs (generic, host, explicit variable, sentence case, placeholder spelling)
- [x] 1.2 `features/settings/machine-store.ts` (alias on the device, `useMachineName`, `useMachineNameSync`) wired in the root layout

## 2. Copy

- [x] 2.1 Three catalogs: `machine.*`, connection banner and errors, pairing errors, push diagnostics, photo error, updates text, Settings "Machine" / name / "Forget this machine"; `claude-remote update` → `remote-harness update`
- [x] 2.2 Settings card title and host name row; `app.config.ts` camera and local network prompts

## 3. Verification

- [x] 3.1 `pnpm check` green (turbo typecheck + tests 10/10: parity, machine tests, i18n/start-plan/use-prompt tests updated; Biome on `apps packages`)
