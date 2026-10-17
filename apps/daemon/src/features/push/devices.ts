import { type DevicePlatform, DevicePlatformSchema } from '@remote-harness/protocol'
import { z } from 'zod'
import { readJsonFile, writeJsonAtomic } from '../../infra/fs.ts'

const DeviceSchema = z.object({
  token: z.string(),
  // Missing in files written before Android support (those phones are iPhones).
  platform: DevicePlatformSchema.optional(),
  registeredAt: z.string(),
})
const DevicesSchema = z.object({ tokens: z.array(DeviceSchema) })

export type Device = z.infer<typeof DeviceSchema>

const PLATFORM_LABEL: Record<DevicePlatform, string> = { ios: 'iOS', android: 'Android' }

/**
 * Platforms of the registered phones for `doctor`, newest first (e.g. `Android, iOS`), or null when
 * none is registered. Devices without a platform were registered by the iOS-only app.
 */
export function describeDevices(devices: readonly Device[]): string | null {
  if (devices.length === 0) return null
  return devices.map((d) => PLATFORM_LABEL[d.platform ?? 'ios']).join(', ')
}

/** Only a handful of tokens are kept: this is a single-user, single-phone app. */
export const MAX_DEVICES = 3

/** FCM tokens of paired phones. Newest first; the oldest are dropped when a token is renewed. */
export class DeviceRegistry {
  private tokens: Device[] = []

  constructor(private readonly path: string) {}

  async load(): Promise<void> {
    const parsed = DevicesSchema.safeParse(await readJsonFile(this.path).catch(() => undefined))
    this.tokens = parsed.success ? parsed.data.tokens : []
  }

  list(): string[] {
    return this.tokens.map((t) => t.token)
  }

  /** Registered devices with their platform, newest first (for `doctor`). */
  devices(): readonly Device[] {
    return this.tokens
  }

  async register(token: string, platform?: DevicePlatform): Promise<void> {
    this.tokens = [
      { token, ...(platform ? { platform } : {}), registeredAt: new Date().toISOString() },
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
