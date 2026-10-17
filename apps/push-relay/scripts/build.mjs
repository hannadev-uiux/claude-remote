// Bundles the function into deploy/ with a package.json that only lists the runtime dependencies,
// so Cloud Build runs a plain `npm install` without workspace references.
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'deploy')
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const external = ['firebase-functions', 'firebase-admin']

await rm(out, { recursive: true, force: true })
await mkdir(out, { recursive: true })
await build({
  entryPoints: [join(root, 'src/index.ts')],
  outfile: join(out, 'index.js'),
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  external: external.flatMap((name) => [name, `${name}/*`]),
  logLevel: 'warning',
})
await writeFile(
  join(out, 'package.json'),
  `${JSON.stringify(
    {
      name: 'remote-harness-push-relay',
      private: true,
      main: 'index.js',
      engines: { node: '22' },
      dependencies: Object.fromEntries(external.map((name) => [name, pkg.dependencies[name]])),
    },
    null,
    2,
  )}\n`,
)
// Parameter values (e.g. APP_CHECK=enforce in .env.<project-id>) are read from the deployed folder.
for (const name of await readdir(root)) {
  if (/^\.env(\..+)?$/.test(name)) await copyFile(join(root, name), join(out, name))
}
console.log(`push relay bundled into ${out}`)
