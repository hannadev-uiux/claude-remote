import { defineConfig } from 'vite'

// One self-contained file for the container: `?raw`/`?inline` imports and every dependency bundled.
export default defineConfig({
  build: {
    ssr: 'src/main.ts',
    outDir: 'dist',
    target: 'node22',
    emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: 'server.js' } },
  },
  ssr: { noExternal: true, target: 'node' },
})
