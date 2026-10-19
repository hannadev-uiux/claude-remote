import { bindings, defineConfig, triggers } from 'cf/config'
import * as entrypoint from './src/index.ts' with { type: 'cf-worker' }

/**
 * Worker behind remoteharness.app: the landing page, the docs, the installers, the Expo Updates
 * server and the app install link (updates and builds in R2). The zone's redirect rules still answer `www` and the installers (the Worker mirrors those
 * two); its old fallback to the repository has to be removed for the landing to be reachable,
 * since redirect rules run before Workers.
 */
export default defineConfig({
  worker: {
    name: 'remote-harness-web',
    compatibilityDate: '2026-10-06',
    entrypoint,
    workersDev: false,
    env: {
      IOS_BUILDS: bindings.r2({ name: 'remote-harness-ios' }),
      // The Expo Updates server: assets, every published manifest and the latest per runtime.
      UPDATES: bindings.r2({ name: 'remote-harness-updates' }),
      // Publish tokens (production: any channel; development: CI, development only). Set with the CLI.
      UPDATES_TOKEN: bindings.secret(),
      UPDATES_DEV_TOKEN: bindings.secret(),
    },
    triggers: [
      triggers.fetch({ pattern: 'remoteharness.app/*', zone: 'remoteharness.app' }),
      triggers.fetch({ pattern: 'remoteharness.app/api/updates/*', zone: 'remoteharness.app' }),
      triggers.fetch({ pattern: 'remoteharness.app/ios/*', zone: 'remoteharness.app' }),
      triggers.fetch({ pattern: 'remoteharness.app/app/*', zone: 'remoteharness.app' }),
    ],
  },
})
