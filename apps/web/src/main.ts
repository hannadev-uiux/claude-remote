/**
 * Entry of `dist/server.js` (the container's command). Environment: `PORT` (8080), `DATA_DIR`
 * (`./data`), `UPDATES_TOKEN` and `UPDATES_DEV_TOKEN` (publishing is off without them).
 */
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fsStores } from './fs-stores.ts'
import { closeServer, createSiteServer } from './server.ts'

const port = Number(process.env.PORT ?? 8080)
const dataDir = resolve(process.env.DATA_DIR ?? 'data')
await mkdir(resolve(dataDir, 'updates'), { recursive: true })
await mkdir(resolve(dataDir, 'app'), { recursive: true })

const server = createSiteServer({
  ...fsStores(dataDir),
  tokens: {
    token: process.env.UPDATES_TOKEN || undefined,
    devToken: process.env.UPDATES_DEV_TOKEN || undefined,
  },
})
server.listen(port, () => console.log(`remoteharness.app on :${port}, data in ${dataDir}`))

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    // A request that never ends must not keep the container from stopping.
    setTimeout(() => process.exit(1), 10_000).unref()
    closeServer(server).then(
      () => process.exit(0),
      () => process.exit(1),
    )
  })
}
