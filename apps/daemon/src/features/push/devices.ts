import { z } from 'zod'
import { readJsonFile, writeJsonAtomic } from '../../infra/fs.ts'

const DevicesSchema = z.object({ tokens: z.array(z.object({ token: z.string(), registeredAt: z.string() })) })

/** Only a handful of tokens are kept: this is a single-user, single-phone app. */
export const MAX_DEVICES = 3

/** FCM tokens of paired phones. Newest first; the oldest are dropped when a token is renewed. */
export class DeviceRegistry {
  private tokens: { token: string; registeredAt: string }[] = []

  constructor(private readonly path: string) {}

  async load(): Promise<void> {
    const parsed = DevicesSchema.safeParse(await readJsonFile(this.path).catch(() => undefined))
    this.tokens = parsed.success ? parsed.data.tokens : []
  }

  list(): string[] {
    return this.tokens.map((t) => t.token)
  }

  async register(token: string): Promise<void> {
    this.tokens = [
      { token, registeredAt: new Date().toISOString() },
      ...this.tokens.filter((t) => t.token !== token),
    ].slice(0, MAX_DEVICES)
    await writeJsonAtomic(this.path, { tokens: this.tokens }, 0o600)
  }

  async remove(tokens: readonly string[]): Promise<void> {
    if (tokens.length === 0) return
    this.tokens = this.tokens.filter((t) => !tokens.includes(t.token))
    await writeJsonAtomic(this.path, { tokens: this.tokens }, 0o600)
  }
}
