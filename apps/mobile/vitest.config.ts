import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Only pure TypeScript (no react-native imports) is unit-tested here.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
})
