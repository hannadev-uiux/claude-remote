import { initializeApp } from 'firebase-admin/app'
import { getAppCheck } from 'firebase-admin/app-check'
import { getMessaging } from 'firebase-admin/messaging'
import { defineSecret, defineString } from 'firebase-functions/params'
import { logger } from 'firebase-functions/v2'
import { onRequest } from 'firebase-functions/v2/https'
import { parseGrantKey } from './grant.ts'
import { type AppCheckMode, createRelayHandler } from './handler.ts'
import { RateLimiter } from './rate-limit.ts'

/** 32 random bytes (hex or base64): `openssl rand -hex 32 | firebase functions:secrets:set GRANT_KEY`. */
const GRANT_KEY = defineSecret('GRANT_KEY')
/** `monitor` (default) logs grants without a valid App Check token; `enforce` rejects them. */
const APP_CHECK = defineString('APP_CHECK', { default: 'monitor' })

// Runs with the project's default credentials: no service account key exists anywhere.
initializeApp()
const limiter = new RateLimiter()
let handler: ReturnType<typeof createRelayHandler> | null = null

function relay() {
  handler ??= createRelayHandler({
    key: parseGrantKey(GRANT_KEY.value()),
    appCheck: (APP_CHECK.value() === 'enforce' ? 'enforce' : 'monitor') satisfies AppCheckMode,
    verifyAppCheck: async (token) => {
      await getAppCheck().verifyToken(token)
      return true
    },
    send: async (message) => {
      await getMessaging().send(message)
    },
    limiter,
    now: Date.now,
    warn: (message, details) => logger.warn(message, details),
  })
  return handler
}

export const pushRelay = onRequest(
  {
    region: 'southamerica-east1',
    // Dedicated identity with only FCM send (roles/firebasecloudmessaging.admin) and the secret.
    serviceAccount: 'push-relay@',
    // Callers are the app and daemons, without Google sign-in: grants and App Check authorize them.
    invoker: 'public',
    secrets: [GRANT_KEY],
    maxInstances: 3,
    concurrency: 40,
    memory: '256MiB',
  },
  async (req, res) => {
    const result = await relay()({
      method: req.method,
      path: req.path,
      header: (name) => req.get(name),
      body: req.body,
    })
    res.status(result.status).json(result.body)
  },
)
