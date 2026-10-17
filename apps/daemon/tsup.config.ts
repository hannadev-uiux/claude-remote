import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node24',
  clean: true,
  sourcemap: true,
  // The protocol package ships TypeScript sources, so it is bundled; npm deps stay external.
  noExternal: ['@remote-harness/protocol'],
})
