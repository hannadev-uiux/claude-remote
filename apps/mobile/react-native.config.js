// Firebase (push) is optional: without GoogleService-Info.plist its native pods are not linked,
// so the iOS build works without a Firebase project. Keep in sync with app.config.ts.
const { existsSync } = require('node:fs')
const { join } = require('node:path')

const firebaseEnabled = existsSync(join(__dirname, 'GoogleService-Info.plist'))
const disabled = { platforms: { ios: null, android: null } }

module.exports = {
  dependencies: firebaseEnabled
    ? {}
    : {
        '@react-native-firebase/app': disabled,
        '@react-native-firebase/messaging': disabled,
        '@react-native-firebase/app-check': disabled,
      },
}
