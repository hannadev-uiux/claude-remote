import { defineConfig } from 'cf/config'
import * as entrypoint from './src/worker.ts' with { type: 'cf-worker' }

/** Worker that serves the push relay on push.remoteharness.app (`cf deploy` from this folder). */
export default defineConfig({
  worker: {
    name: 'remote-harness-push-relay',
    compatibilityDate: '2026-10-01',
    entrypoint,
    domains: ['push.remoteharness.app'],
    workersDev: false,
    previewUrls: false,
  },
})
