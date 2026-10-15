/**
 * Lists the physical iOS devices Xcode knows and checks one can be built to, before the slow
 * prebuild. `tsx scripts/ios-devices.mts [--check] [--udid] [name|udid]` (Make: `ios-devices`,
 * `install-ios`). `--udid` prints only the chosen device's UDID on stdout (the list goes to stderr).
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { HINTS, parseDevices, pickDevice } from './ios-device-state.ts'

const args = process.argv.slice(2)
const check = args.includes('--check') || args.includes('--udid')
const printUdid = args.includes('--udid')
const wanted = args.find((a) => !a.startsWith('--')) || undefined
const log = printUdid ? console.error : console.log

const dir = mkdtempSync(join(tmpdir(), 'ios-devices-'))
let json: unknown
try {
  execFileSync('xcrun', ['devicectl', 'list', 'devices', '--json-output', join(dir, 'devices.json')], {
    stdio: 'ignore',
  })
  json = JSON.parse(readFileSync(join(dir, 'devices.json'), 'utf8'))
} catch {
  console.error('✗ `xcrun devicectl` failed: install Xcode and open it once to finish its setup.')
  process.exit(1)
} finally {
  rmSync(dir, { recursive: true, force: true })
}

const devices = parseDevices(json)
for (const d of devices) log(`${d.state === 'ready' ? '✓' : '·'} ${d.name}  ${d.udid}  ${d.state}`)
if (devices.length === 0) log('· no physical iOS device known to Xcode')

if (check) {
  const picked = pickDevice(devices, wanted)
  if (!picked.ok) {
    console.error(`\n✗ ${picked.device ? `${picked.device.name}: ` : ''}${HINTS[picked.reason]}`)
    process.exit(1)
  }
  log(`→ ${picked.device.name}`)
  if (printUdid) console.log(picked.device.udid)
}
