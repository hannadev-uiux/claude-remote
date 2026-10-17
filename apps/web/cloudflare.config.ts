import { bindings, defineConfig, triggers } from 'cf/config'
import * as entrypoint from './src/index.ts' with { type: 'cf-worker' }

/**
 * Worker behind remoteharness.app. The zone's redirect rules answer everything else (www, the
 * installers and the fallback to the repository); these routes are excluded from the fallback.
 */
export default defineConfig({
  worker: {
    name: 'remote-harness-web',
    compatibilityDate: '2026-10-06',
    entrypoint,
    workersDev: false,
    env: {
      IOS_BUILDS: bindings.r2({ name: 'remote-harness-ios' }),
    },
    triggers: [
      triggers.fetch({ pattern: 'remoteharness.app/api/updates/*', zone: 'remoteharness.app' }),
      triggers.fetch({ pattern: 'remoteharness.app/ios/*', zone: 'remoteharness.app' }),
    ],
  },
})
