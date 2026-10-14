import { timingSafeEqual } from 'node:crypto'
import Fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify'
import type { Logger } from '../core/logger.ts'

export const SECRET_HEADER = 'x-claude-remote-secret'

function secretMatches(expected: string, received: unknown): boolean {
  if (typeof received !== 'string') return false
  const a = Buffer.from(expected)
  const b = Buffer.from(received)
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Local-only HTTP server for Claude Code hooks and admin commands from the CLI.
 * Every request must carry the shared secret.
 */
export function createHooksServer(options: { secret: string; logger: Logger }): FastifyInstance {
  const app = Fastify({
    loggerInstance: // request logs are info-level; keep only warnings and errors from Fastify itself
      options.logger.child({ component: 'hooks' }, { level: 'warn' }) as FastifyBaseLogger,
    bodyLimit: 5 * 1024 * 1024,
  }) as unknown as FastifyInstance
  app.addHook('onRequest', async (request, reply) => {
    if (!secretMatches(options.secret, request.headers[SECRET_HEADER])) {
      await reply.code(401).send({ error: 'unauthorized' })
    }
  })
  app.get('/health', async () => ({ ok: true }))
  return app
}
