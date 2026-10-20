/**
 * Publishes the Android release APK on the web install link (Make: `install-android-link`), next to
 * the iOS build of `make install-ios-link IOS_LINK=web`: the same server folder, the same random token
 * (`<dir>/.web-token`) and the same page, https://remoteharness.app/app/<token>/, which shows the
 * APK to Android phones.
 * - `tsx scripts/android-link.mts --check` checks the site server over SSH and the Android SDK.
 * - `tsx scripts/android-link.mts <app-release.apk> <dir>` uploads the APK, then its `builds.json`
 *   entry (version from `expo config`, size, date), and prints the link.
 * The APK keeps the prebuild's release signing, the same for every build made on this machine, so a
 * newer one installs over the previous one.
 */
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { androidVersion, WEB_BASE } from './app-link-files.ts'
import { checkWebHost, publishBuilds, webPut, webToken } from './app-link-web.mts'

const APK = 'RemoteHarness.apk'

function checkSdk(): void {
  const sdk = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT, join(homedir(), 'Library/Android/sdk')]
  if (!sdk.some((dir) => dir && existsSync(join(dir, 'platform-tools')))) {
    console.error(
      '✗ Android SDK not found: install Android Studio (or the command line tools) and set ANDROID_HOME.',
    )
    process.exit(1)
  }
}

const args = process.argv.slice(2)
if (args.includes('--check')) {
  checkWebHost()
  checkSdk()
  console.log(`✓ ${WEB_BASE}/<token>/`)
  process.exit(0)
}
const [apkArg, dirArg] = args
if (!apkArg || !dirArg) {
  console.error('usage: tsx scripts/android-link.mts --check | <app-release.apk> <dir>')
  process.exit(1)
}
const apk = resolve(apkArg)
if (!existsSync(apk)) {
  console.error(`✗ APK not found: ${apk}`)
  process.exit(1)
}
const dir = resolve(dirArg)
mkdirSync(dir, { recursive: true })
const token = webToken(dir)
const config: unknown = JSON.parse(
  execFileSync('npx', ['expo', 'config', '--type', 'public', '--json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }),
)
const { version, versionCode } = androidVersion(config)

copyFileSync(apk, join(dir, APK))
const target = checkWebHost()
webPut(target, dir, token, APK)
publishBuilds(target, dir, token, {
  android: { version, versionCode, builtAt: new Date().toISOString(), size: statSync(apk).size },
})
console.log(`✓ Remote Harness ${version} (${versionCode}) for Android ready`)
console.log(`  On the phone, open the link and tap Download (iPhone: make install-ios-link IOS_LINK=web):`)
console.log(`  ${WEB_BASE}/${token}/`)
