import { bindings, defineConfig, triggers } from 'cf/config'
import * as entrypoint from './src/index.ts' with { type: 'cf-worker' }

/**
 * Worker behind remoteharness.app: the landing page, the updates proxy and the app install link
 * (iOS and Android builds in R2). The zone's redirect rules still answer `www` and the installers (the Worker mirrors those
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
    },
    triggers: [
      triggers.fetch({ pattern: 'remoteharness.app/*', zone: 'remoteharness.app' }),
      triggers.fetch({ pattern: 'remoteharness.app/api/updates/*', zone: 'remoteharness.app' }),
      triggers.fetch({ pattern: 'remoteharness.app/ios/*', zone: 'remoteharness.app' }),
      triggers.fetch({ pattern: 'remoteharness.app/app/*', zone: 'remoteharness.app' }),
    ],
  },
})
