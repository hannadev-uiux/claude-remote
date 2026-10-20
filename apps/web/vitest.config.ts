import { defineConfig } from 'vitest/config'

// Pure logic, the file-system stores on a temporary folder and the Node server on a free port.
export default defineConfig({ test: { include: ['test/**/*.test.ts'] } })
