import { defineConfig } from 'vitest/config'

// Only the pure routing is tested here; the Worker runtime is exercised against the live domain.
export default defineConfig({ test: { include: ['test/**/*.test.ts'] } })
