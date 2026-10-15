import { homedir } from 'node:os'
import { isDeepStrictEqual } from 'node:util'
import { checkoutPeers } from '@claude-remote/protocol'
import { DaemonError } from '../../core/errors.ts'
import { GitClient } from '../../infra/git.ts'
import type { DaemonContext } from '../../main.ts'
import { validateCwd } from '../lifecycle/service.ts'
import type { SessionStore } from '../sessions/store.ts'
import { CheckoutResolver, needsCheckout } from './resolver.ts'

/** Keeps `session.checkout` up to date and answers `checkout.inspect`. */
export function registerCheckoutFeature(ctx: DaemonContext, store: SessionStore, home = homedir()) {
  const resolver = new CheckoutResolver(new GitClient(ctx.exec))

  store.onChange((session, previous) => {
    if (!needsCheckout(session, previous)) return
    const cwd = session.cwd
    void resolver.resolve(cwd).then((checkout) => {
      const current = store.get(session.id)
      // Ignore an answer for a directory the session has already left.
      if (!current || current.cwd !== cwd || isDeepStrictEqual(current.checkout, checkout)) return
      store.upsert(session.id, { checkout, updatedAt: current.updatedAt })
    })
  })

  ctx.router.register('checkout.inspect', async (msg) => {
    if (!ctx.profiles.some((p) => p.id === msg.profileId)) {
      throw new DaemonError('not_found', `profile ${msg.profileId} not found`)
    }
    const cwd = await validateCwd(msg.cwd, home)
    const checkout = await resolver.resolve(cwd, { fresh: true })
    const peers = checkoutPeers({ id: '', checkout }, store.all()).map((s) => ({ id: s.id, title: s.title }))
    return { type: 'checkout.info', checkout, peers }
  })

  return { resolver }
}
