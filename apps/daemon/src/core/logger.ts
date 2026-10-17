import pino, { type Logger } from 'pino'
import { envVar } from './env.ts'

export type { Logger }

export function createLogger(options: { level?: string; pretty?: boolean } = {}): Logger {
  const level = options.level ?? envVar('LOG_LEVEL') ?? 'info'
  if (options.pretty) {
    return pino({
      level,
      transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } },
    })
  }
  return pino({ level })
}

export const silentLogger: Logger = pino({ level: 'silent' })
