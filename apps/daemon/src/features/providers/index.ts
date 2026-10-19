import { paths } from '../../core/paths.ts'
import type { DaemonContext } from '../../main.ts'
import { type ProviderFetch, ProviderService } from './service.ts'

export type ProvidersDeps = {
  /** The profile's provider key from the OS secret store (`null` when none is stored). */
  key: (profileId: string) => Promise<string | null>
  fetch?: ProviderFetch
}

/** `models.list` and `provider.status` for profiles with a provider. */
export function registerProvidersFeature(ctx: DaemonContext, deps: ProvidersDeps) {
  const service = new ProviderService({
    profiles: ctx.profiles,
    fetch: deps.fetch ?? fetch,
    key: deps.key,
    cachePath: paths.modelsCache(),
    logger: ctx.logger,
  })
  ctx.router.register('models.list', async (msg) => ({
    type: 'models.results',
    ...(await service.models(msg.profileId)),
  }))
  ctx.router.register('provider.status', async (msg) => ({
    type: 'provider.info',
    ...(await service.status(msg.profileId)),
  }))
  return { service }
}
