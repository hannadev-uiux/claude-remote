/**
 * Reference catalog: its shape is the `Messages` type, and `pt-BR`/`es-ES` must match it.
 * Interpolation and plurals are functions. Product names (Claude Code, Remote Harness, Tailscale,
 * tmux) are never translated. Log messages are not here: logs stay in English.
 */
export const enUS = {
  cli: {
    description: 'Remote Harness daemon: follow and drive your coding agents from your phone',
    help: 'display help for command',
    version: 'output the version number',
    buildMissing: 'Build not found: run `pnpm --filter @remote-harness/daemon build`.',
    unsupportedPlatform: (platform: string, supported: string) =>
      `Unsupported system (${platform}). Remote Harness runs on ${supported}.`,
    start: {
      description: 'start the daemon',
      dev: 'listen on 127.0.0.1 instead of Tailscale',
      host: 'WebSocket listen address',
      waitTailscale: 'wait for the Tailscale interface instead of failing (used by the background service)',
    },
    pair: {
      description: 'show the pairing QR code (address + token)',
      dev: 'use 127.0.0.1',
      host: 'address to announce in the QR code',
      tailscaleNotFound:
        'Tailscale not found (no 100.x interface). Install and connect Tailscale, or use --dev for 127.0.0.1.',
      simulatorHint: (port: number) =>
        'To test locally (e.g. in the iOS simulator): `remote-harness start --dev` and `remote-harness pair --dev`' +
        ` (Android emulator: also \`adb reverse tcp:${port} tcp:${port}\`).`,
      scan: 'Scan it with the Remote Harness app. Do not share this code.',
    },
    setup: {
      description: 'wizard: choose accounts and aliases, install hooks and the service, pair the phone',
      yes: 'no questions: keep the config or use the accounts found',
      noService: 'do not install the background service',
      lang: (codes: string) => `language (${codes}); skips the question`,
      invalidLang: (value: string, codes: string) => `Unknown language "${value}". Use one of: ${codes}.`,
      interrupted:
        'Setup interrupted. Everything shown with ✓ is done; run `remote-harness setup` again whenever you like.',
    },
    rotateToken: {
      description: 'generate a new token and drop existing connections',
      rotated: 'Token rotated; connections closed.',
      rotatedOffline: 'Token rotated (the daemon is not running).',
      pairAgain: 'Run `remote-harness pair` to pair again.',
    },
    provider: {
      description: 'model providers of the profiles (OpenRouter key)',
      key: 'store the provider key of a profile in the OS secret store (never in a file we write)',
      stdin: 'read the key from standard input instead of asking',
      prompt: (provider: string) => `${provider} API key:`,
      unknownProfile: (id: string) => `No profile "${id}" in the config.`,
      noProvider: (id: string) =>
        `Profile "${id}" has no provider. Add "provider": { "kind": "openrouter" } to it in config.json first.`,
      empty: 'No key given; nothing stored.',
      saved: (id: string, store: string) =>
        `Key of profile ${id} stored ${store}. New sessions of the profile use it.`,
    },
    keepAwake: {
      description: 'show or set when the computer is kept awake: off, sessions or always',
      modes: {
        off: 'off',
        sessions: 'while sessions are active (and 10 min after)',
        always: 'always, while the daemon runs',
      },
      current: (mode: string) => `keep awake: ${mode}`,
      holding: 'holding the computer awake now',
      notHolding: 'not holding it now',
      unavailable: (reason: string) => `the sleep helper is unavailable: ${reason}`,
      invalid: (value: string, valid: string) => `"${value}" is not a mode; use one of: ${valid}`,
      applied: 'applied to the running daemon',
      notRunning: 'the daemon is not running; it applies at the next start',
    },
    doctor: {
      description: 'check dependencies and configuration',
      notOnPath: 'not found in PATH',
      tailscaleMissing: 'no 100.x interface found',
      profile: (id: string, configDir: string) => `profile ${id} (${configDir})`,
      dirMissing: 'directory does not exist',
      daemonRunning: 'daemon running',
      runStart: 'run `remote-harness start`',
      token: (store: string) => `token ${store}`,
      tokenStores: {
        keychain: 'in the macOS Keychain',
        secretTool: 'in the Secret Service (secret-tool)',
        file: (path: string) => `in the file ${path} (0600)`,
      },
      runPair: 'run `remote-harness pair`',
      providerKey: (id: string, provider: string) => `${provider} key for profile ${id}`,
      runProviderKey: (id: string) => `run \`remote-harness provider key ${id}\``,
      codexHooks: (id: string, path: string) => `Codex hooks for profile ${id} (${path})`,
      codexAccountWithoutProfile: (dir: string) =>
        `Codex account found at ${dir} without a profile. Run \`remote-harness setup\` to add it.`,
      runInstall: 'run `remote-harness install`',
      service: (name: string, detail: string) => `background service ${name} (${detail})`,
      serviceHint: 'optional: `remote-harness service install`',
      launcherNative: 'folder access prompts name "Remote Harness"',
      launcherScript: 'folder access prompts name "node" (no compiled launcher)',
      launcherHint:
        'install the Command Line Tools (`xcode-select --install`), then run `remote-harness service install`',
      fullDiskAccess: 'Full Disk Access',
      fullDiskAccessHint:
        'to avoid one prompt per folder, add "Remote Harness" under System Settings → Privacy & Security → Full Disk Access',
      accessibility: 'Accessibility / Automation',
      accessibilityHint: 'allow "Remote Harness" under System Settings → Privacy & Security → Automation',
      keychain: 'Keychain access',
      keychainHint: 'the token store could not read back the pairing token it just wrote',
      linger: 'lingering (the service keeps running after logout)',
      lingerHint: 'run `loginctl enable-linger $USER`',
      keepAwake: (mode: string, state: string) => `keep awake: ${mode} (${state})`,
      keepAwakeHeld: 'held now',
      keepAwakeIdle: 'not needed now',
      keepAwakeFailed: (reason: string) => `the sleep helper failed: ${reason}`,
      lidNote: 'on a laptop, closing the lid still sleeps unless it is on power with an external display',
      devices: (platforms: string) => `phones registered for push: ${platforms}`,
      noDevices: 'no phone registered for push',
      noDevicesHint: 'open the app and allow notifications',
      pushMode: (mode: string) => `push: ${mode}`,
      noRelayGrant:
        'no phone has a relay grant: use an app build with the push relay, or save a Firebase service account',
    },
    install: {
      description:
        'install launchers, PATH in ~/.zshrc / ~/.bashrc and hooks in the configured profiles (no questions)',
      openTerminal: (rc: string) =>
        `Open a new terminal (or \`source ${rc}\`) and use the launchers instead of \`claude\`.`,
    },
    uninstall: {
      description: 'remove launchers, the PATH block in ~/.zshrc / ~/.bashrc and the installed hooks',
      shellRemoved: (files: string) => `PATH block removed from ${files}`,
      hooksRemoved: (path: string) => `hooks removed from ${path}`,
    },
    service: {
      description: 'daemon as a background service (launchd on macOS, systemd on Linux)',
      install: 'install and start the background service (starts at login and restarts if it crashes)',
      loaded: (path: string) => `service installed: ${path}`,
      app: (path: string) => `app: ${path}`,
      tailscaleWaiting: '⚠ Tailscale not found: the daemon waits for the 100.x interface',
      logs: (path: string) => `logs in ${path}`,
      uninstall: 'stop and remove the background service',
      removed: 'service removed',
      status: 'show whether the service is loaded',
      notLoaded: 'not loaded',
      unavailable:
        'systemd user services are not available here (`systemctl --user` failed). Run `remote-harness start` whenever you want to use it (e.g. in a tmux window).',
      lingerHint:
        'Lingering is off: the service stops when you log out. To keep it running and start it at boot: `loginctl enable-linger $USER`',
      linger: (enabled: boolean): string =>
        enabled
          ? 'lingering on (keeps running after logout, starts at boot)'
          : 'lingering off (stops at logout)',
    },
    update: {
      description:
        'update to the latest version: build, refresh hooks and restart the service (no questions)',
      ref: 'branch or tag to install (default: the update channel)',
      older: (from: string, to: string) =>
        `This installs an older version (${from} → ${to}) because the update channel changed.`,
      force: 'rebuild even when already up to date',
      checking: (ref: string) => `Checking ${ref} for a new version`,
      notInstaller: (dir: string) =>
        `This is not the installer's copy (${dir}). In a development clone use \`git pull\` and \`pnpm --filter @remote-harness/daemon build\`.`,
      dirty: (dir: string) => `${dir} has local changes. Commit or discard them and run again.`,
      fetchFailed: (error: string) => `Could not fetch the new version: ${error}`,
      checkoutFailed: 'Could not switch to the new version.',
      rolledBack: (version: string) =>
        `Went back to ${version} and rebuilt it: the computer stays as it was.`,
      rollBackFailed: 'Could not go back to the previous version: run `remote-harness update` again.',
      upToDate: (version: string, commit: string) => `Already up to date (${version}, ${commit}).`,
      available: (version: string, commit: string) => `New version: ${version} (${commit})`,
      failed: 'Update failed (see above). The previous version keeps running until the next restart.',
      serviceRestarted: 'background service restarted',
      serviceNotInstalled: 'background service not installed (optional: `remote-harness service install`)',
      updated: (from: string, to: string) => `Remote Harness updated: ${from} → ${to}`,
      rebuilt: (version: string) => `Remote Harness ${version} rebuilt`,
    },
    updates: {
      description: 'update channel, automatic updates and the background check',
      status: 'show the version, channel and the last check',
      check: 'check for a new version now',
      channel: 'show or change the channel: main (stable) or development',
      auto: 'turn automatic updates on or off',
      current: (version: string, channel: string) => `Remote Harness ${version} · channel ${channel}`,
      autoState: (on: boolean): string => (on ? 'automatic updates on' : 'automatic updates off'),
      lastCheck: (when: string) => `last check: ${when}`,
      neverChecked: 'not checked yet',
      available: (version: string) => `new version available: ${version}`,
      older: (version: string) =>
        `the channel has an older version: ${version} (\`remote-harness update\` installs it)`,
      upToDate: 'up to date',
      channelSet: (channel: string) => `channel: ${channel}`,
      invalidValue: (value: string, list: string) => `Unknown value "${value}". Use one of: ${list}.`,
      invalidChannel: (value: string, list: string) => `Unknown channel "${value}". Use one of: ${list}.`,
      runUpdate: 'run `remote-harness update` to switch now',
      applied: 'applied to the running daemon',
      notRunning: 'the daemon is not running: it applies on the next start',
    },
    push: {
      description: 'push notifications: status, turn on or off, send a test',
      status: 'show how pushes are sent and to how many phones',
      on: 'send pushes (Firebase service account if present, else the push relay)',
      off: 'stop every push and live status update',
      test: 'send a test notification to every registered phone',
      modes: {
        firebase: (path: string) => `own Firebase (${path})`,
        relay: 'built-in push relay',
        off: 'off (config "push": "off")',
      },
      phones: (count: number) => (count === 1 ? '1 phone registered' : `${count} phones registered`),
      changed: (mode: string) => `push: ${mode}`,
      applied: 'applied to the running daemon',
      notRunning: 'the daemon is not running: it applies on the next start',
      testSent: (count: number) => (count === 1 ? 'test sent to 1 phone' : `test sent to ${count} phones`),
      testResult: {
        off: 'push is off (`remote-harness push on`)',
        unregistered: 'no phone registered: open the app and allow notifications',
        failed: 'sending failed: see the daemon logs',
      },
    },
    rules: {
      description: '"always allow" rules created by the app',
      list: 'list the rules created by the app',
      empty: 'No rules created by the app.',
      undo: 'remove the rule from the file it was written to',
      notFound: (id: string) => `Rule ${id} not found.`,
      removed: (rule: string, file: string) => `Rule ${rule} removed from ${file}.`,
      alreadyGone: 'The rule was no longer in the file.',
    },
  },
  install: {
    missingProviderKey: (id: string, provider: string) =>
      `No ${provider} key stored for profile ${id}: run \`remote-harness provider key ${id}\`.`,
    shortcut: (path: string) => `shortcut ${path}`,
    shellPath: (files: string) => `PATH in ${files}`,
    hooksIn: (path: string) => `hooks in ${path}`,
    codexTrust:
      'Codex asks once to trust new hooks: open `codex` and choose "Trust all and continue" (or review them in /hooks). Until then its sessions stay read-only.',
    launcherRemoved: (id: string) => `launcher ${id} removed`,
    hooksRemovedFrom: (path: string) => `hooks removed from ${path}`,
    statusLineIn: (path: string) => `status line in ${path}`,
    statusLineRestored: (path: string) => `status line restored in ${path}`,
  },
  setup: {
    languageQuestion: 'Language',
    keys: {
      navigate: 'navigate',
      select: 'select',
      submit: 'confirm',
      all: 'all',
      invert: 'invert',
    },
    yes: 'yes',
    no: 'no',
    welcome: {
      title: 'Welcome to Remote Harness!',
      intro1: (machine: string) => `Let's get this ${machine} ready so you can follow and control`,
      intro2: 'your coding agents from your phone. It takes about 2 minutes.',
      footer: (version: string) => `v${version} · ↑/↓ to choose · Enter to confirm · Ctrl+C to quit`,
    },
    steps: {
      accounts: 'Claude Code accounts',
      installing: 'Installing launchers, PATH and hooks',
      service: 'Background service',
      tailscale: 'Tailscale and phone',
    },
    noAccounts: 'No Claude Code account found. Run `claude` once to log in, then `remote-harness setup`.',
    confirmSave: 'Save and install?',
    nothingChanged: 'Nothing was changed.',
    serviceQuestion: (machine: string) =>
      `Start Remote Harness with the ${machine} (and restart it if it crashes)?`,
    noService: 'No service: run `remote-harness start` whenever you want to use it.',
    serviceUnavailable:
      '  systemd user services are not available here (`systemctl --user`).\n' +
      '  Run `remote-harness start` whenever you want to use it (e.g. in a tmux window or from your init system).',
    lingerQuestion:
      'Keep Remote Harness running after you log out and start it at boot? (loginctl enable-linger)',
    lingerEnabled: 'lingering enabled (loginctl enable-linger)',
    lingerFailed:
      "  Couldn't enable lingering. Run `sudo loginctl enable-linger $USER` to keep the daemon running after logout.",
    lingerSkipped:
      '  Without lingering the daemon stops when you log out. Enable it later with `loginctl enable-linger $USER`.',
    tailscaleIntro: (machine: string, install: string) =>
      `  The ${machine} and the phone talk over a private Tailscale network (free), from anywhere.\n` +
      `  1. On the ${machine}: ${install}\n` +
      '  2. On the phone: install "Tailscale" (App Store or Google Play) and sign in with the same account',
    tailscaleInstall: {
      darwin:
        'install it from https://tailscale.com/download/mac (or `brew install --cask tailscale`) and sign in',
      linux: 'install it with `curl -fsSL https://tailscale.com/install.sh | sh` and run `sudo tailscale up`',
    },
    tailscaleQuestion: (machine: string) => `Is Tailscale connected on the ${machine}?`,
    tailscaleRetry: "I've connected it, check again",
    tailscaleSkip: "I'll do it later",
    tailscaleNotYet: '  Still no Tailscale interface (100.x) found.',
    phoneHint:
      '  On the phone: install the Remote Harness app and Tailscale (same account) and tap "QR code".',
    showQr: 'Show the pairing QR code now?',
    done: {
      installed: 'Remote Harness installed.',
      openTerminal: (command: string) => `1. Open a new terminal (or ${command})`,
      useAliases: (aliases: string, claude: string) =>
        `2. Use ${aliases} instead of ${claude}, with the same arguments`,
      pairIfNeeded: (command: string) => `3. Pair with ${command} if you haven't yet`,
      connectAndPair: (command: string) => `3. Connect Tailscale and run ${command}`,
      footer: 'remote-harness doctor checks it all · remote-harness setup edits accounts',
    },
    accounts: {
      explain:
        '  Each Claude Code account lives in a configuration folder (CLAUDE_CONFIG_DIR).\n' +
        '  For each one you choose a command (alias) that opens it in tmux, ready for the phone.',
      which: 'Which accounts do you want to control from the phone?',
      noneFound: (machine: string) => `  No Claude Code account found on this ${machine}; let's create one.`,
      more: 'Any other account?',
      howToAdd: 'How do you want to add the account?',
      noContinue: 'No, continue',
      create: 'Create a new account',
      createDescription:
        'Creates the folder and opens Claude Code in it so you can log in (e.g. a work account)',
      existing: 'Add a folder that already exists',
      existingDescription: 'A folder used before with CLAUDE_CONFIG_DIR=<folder> claude',
      folderPath: 'Folder path (e.g. ~/.claude-work):',
      folderNotFound:
        'Folder not found. For an account that does not exist yet, choose "Create a new account".',
      alias: 'Command (alias) to open this account:',
      aliasClash: (alias: string, path: string) =>
        `\`${alias}\` already exists at ${path}. The launcher will take precedence in PATH. Use it anyway?`,
      name: 'Name shown in the app:',
      nameRequired: 'Give it a name to recognize the account in the app.',
    },
    newAccount: {
      folder: 'Folder for the new account:',
      alreadyLoggedIn: (dir: string, login: string) => `${dir} is already logged in (${login})`,
      instructions: (dir: string) =>
        `\n  I'll open Claude Code using ${dir}. Once inside:\n` +
        '  1. Follow the initial setup and sign in with the account this folder will use (if it does not ask, type /login)\n' +
        '  2. After logging in, type /exit to come back here\n',
      pressEnter: 'Press Enter to open Claude Code',
      loggedIn: (dir: string, login: string) => `Logged in at ${dir} (${login})`,
      claudeMissing: "\n  Couldn't open `claude`. Install Claude Code: https://claude.com/claude-code",
      noLogin: '\n  No login found in that folder.',
      whatNow: 'What now?',
      retry: 'Open Claude Code again',
      addAnyway: "Add it anyway (I'll log in later through the alias)",
      giveUp: 'Give up on this account',
    },
    provider: {
      add: (provider: string) => `Add an ${provider} profile`,
      addDescription: (provider: string) =>
        `Claude Code routed through ${provider}, paid with your ${provider} key (no Anthropic login)`,
      title: (provider: string) => `\n  Profiles routed through ${provider}:`,
      manage: (id: string, provider: string, key: string) => `${id} · via ${provider} · ${key}`,
      keyStored: 'key stored',
      keyMissing: 'no key stored',
      keep: 'Keep it',
      replaceKey: 'Replace the key',
      remove: 'Remove the profile',
      removeDescription: 'Removes its launcher, hooks and stored key; the folder stays',
      folder: 'Folder of the profile (its own CLAUDE_CONFIG_DIR):',
      model: "Default model (optional, e.g. anthropic/claude-sonnet-5.5; empty = the gateway's default):",
      key: (provider: string) => `${provider} API key (hidden; empty = store it later):`,
      checking: (provider: string) => `Checking the key with ${provider}…`,
      accepted: 'Key accepted',
      acceptedCredits: (left: string) => `Key accepted · ${left} in credits left`,
      rejected: (provider: string) => `${provider} rejected this key.`,
      unchecked: (provider: string, reason: string) =>
        `Could not check the key with ${provider} (${reason}); it will be stored anyway.`,
      whatNow: 'What now?',
      retry: 'Type it again',
      keepAnyway: 'Store it anyway',
      skip: 'Skip it (store it later)',
      later: (id: string) => `No key for now. Later: remote-harness provider key ${id}`,
      keySaved: (id: string, store: string) => `key of ${id} stored ${store}`,
      keyRemoved: (id: string) => `key of ${id} removed from the secret store`,
      keyFailed: (id: string, error: string) => `could not store the key of ${id}: ${error}`,
      via: (provider: string) => `via ${provider}`,
    },
  },
  /** Windows (WSL2) texts: CLI, doctor and setup. */
  wsl: {
    windowsHint:
      'On Windows, Remote Harness runs inside WSL2. In PowerShell: `irm https://remoteharness.app/install | iex`',
    detected: (distro: string) => `WSL2 (distribution ${distro})`,
    unknownDistro: 'unknown',
    systemd: 'systemd running in WSL',
    systemdHint: 'run `remote-harness setup` to enable it ([boot] systemd=true in /etc/wsl.conf)',
    systemdPendingHint:
      'already enabled in /etc/wsl.conf: run `wsl --shutdown` in Windows PowerShell and open the distribution again',
    networking: (mode: string) => `WSL networking: ${mode}`,
    networkingUnknown: 'unknown (%UserProfile%\\.wslconfig not found)',
    tailscaleHint:
      'run Tailscale inside WSL or use mirrored networking with Tailscale on Windows (`remote-harness setup` explains both)',
    source: {
      wsl: 'inside WSL',
      mirrored: 'Windows, mirrored networking',
      unknown: 'WSL',
    },
    logonTask: 'Windows logon task "Remote Harness" (starts WSL at logon)',
    logonTaskHint: 'optional: `remote-harness setup` creates it',
    logonTaskMissing: 'no Windows logon task: WSL (and the daemon) only start when you open the distribution',
    logonTaskRemoved: 'Windows logon task "Remote Harness" removed',
    serviceNoSystemd:
      'systemd is not running in this WSL distribution, so there is no background service. Run `remote-harness setup` to enable it ([boot] systemd=true in /etc/wsl.conf), then `wsl --shutdown` in Windows PowerShell.',
    restart:
      '  For it to take effect, in Windows PowerShell run `wsl --shutdown`, open the distribution again and run `remote-harness setup`.',
    systemdIntro:
      '  Inside WSL the background service needs systemd, which is off in this distribution.\n' +
      '  It is turned on by [boot] systemd=true in /etc/wsl.conf (a root file, backed up first) with:',
    systemdCommand: (command: string) => `    ${command}`,
    systemdQuestion: 'Enable systemd in WSL now? (sudo may ask for your Linux password)',
    systemdEnabled: 'systemd enabled in /etc/wsl.conf',
    systemdFailed: (error: string) =>
      `  Couldn't change /etc/wsl.conf (${error}). Add these lines to it with \`sudo nano /etc/wsl.conf\`:\n    [boot]\n    systemd=true`,
    systemdSkipped:
      '  Without systemd there is no background service: run `remote-harness start` whenever you want to use it.',
    systemdPending: '  systemd is already enabled in /etc/wsl.conf, but WSL has not restarted since.',
    logonTaskQuestion:
      'Start WSL when you log in to Windows, so the daemon runs without opening a terminal? (Scheduled Task "Remote Harness")',
    logonTaskCreated: 'Windows logon task "Remote Harness"',
    logonTaskFailed: (error: string, command: string) =>
      `  Couldn't create the task (${error}). In PowerShell (as administrator if access is denied):\n    ${command}`,
    logonTaskSkipped:
      '  Without the logon task, WSL and the daemon start when you open the distribution. Create it later with `remote-harness setup`.',
    tailscaleIntro:
      '  The computer and the phone talk over a private Tailscale network (free). Inside WSL there are two ways:\n' +
      '  A. Tailscale inside WSL (any Windows): `curl -fsSL https://tailscale.com/install.sh | sh` and `sudo tailscale up`\n' +
      '  B. Tailscale on Windows + WSL mirrored networking (Windows 11 22H2+): networkingMode=mirrored in .wslconfig\n' +
      '  On the phone: install "Tailscale" (App Store or Google Play) and sign in with the same account',
    tailscaleMirrored: 'Tailscale runs on Windows: enable mirrored networking (.wslconfig)',
    mirroredEnabled: (path: string) => `networkingMode=mirrored in ${path}`,
    mirroredAlready: (path: string) => `networkingMode=mirrored was already in ${path}`,
    mirroredNoConfig:
      "  Couldn't find %UserProfile%\\.wslconfig (is Windows interop off?). Add [wsl2] networkingMode=mirrored to it by hand.",
  },
  /** How texts name this machine (with the article in each text). */
  power: {
    why: 'Remote Harness sessions are running',
  },
  bundle: {
    folderAccess:
      'Remote Harness runs your coding agent sessions in this folder and needs to read and write its files.',
  },
  machine: { darwin: 'Mac', linux: 'computer' },
  profiles: {
    defaultName: 'Personal',
    /** Suffix of a suggested `~/.claude-<name>` folder: 0 and 1 are words, the rest numbered. */
    newDirName: (index: number) => (index === 0 ? 'work' : index === 1 ? 'personal' : `account-${index}`),
    newDirFallback: 'new',
    claudeAccount: 'Claude account',
    apiKey: 'API key',
    aliasFormat: 'Use lowercase letters, numbers, - or _, starting with a letter (up to 32).',
    aliasReserved: (alias: string) => `"${alias}" is reserved: the launcher calls \`${alias}\` itself.`,
    aliasTaken: (alias: string) => `"${alias}" is already used by another profile.`,
    dirAbsolute: 'Use an absolute path or one starting with ~/.',
    dirOtherTool: (dir: string) => `${dir} belongs to another tool; choose another name.`,
    dirInList: 'That folder is already in the account list.',
    dirIsFile: 'A file with that name already exists.',
  },
  /** Sent back to Claude Code (shown in its TUI). */
  claudeCode: {
    denied: 'Denied by Remote Harness',
    keepPlanning: 'The user wants to keep planning. Revise the plan before calling ExitPlanMode again.',
  },
  live: {
    states: { working: 'Working', waiting: 'Waiting for you', done: 'Done', closed: 'Session closed' },
    steps: {
      thinking: 'thinking',
      writing: 'writing the answer',
      command: 'running a command',
      editing: 'editing files',
      reading: 'reading files',
      searching: 'searching the code',
      web: 'browsing the web',
      agent: 'running a subagent',
      planning: 'updating the plan',
      tool: 'using a tool',
      permission: 'permission pending',
    },
    tools: (count: number) => (count === 1 ? '1 tool' : `${count} tools`),
    /** Background tasks and running subagents of the session, shown when there is at least one. */
    tasks: (count: number) => (count === 1 ? '1 task running' : `${count} tasks running`),
    /** Time since the state changed; the widget puts a live counter in `{time}`. */
    ago: '{time} ago',
    /** Lock screen buttons while a tool permission waits. */
    allow: 'Allow',
    deny: 'Deny',
    /** Beside the frozen timer once the turn is done. */
    total: 'total',
    /** Under the state once the session closed. */
    closedHint: 'transcript kept · resume from the app',
  },
  updates: {
    available: (version: string) => `Remote Harness ${version} available`,
    availableBody: 'Update from the menu bar icon or run `remote-harness update`.',
    older: (version: string) => `Remote Harness ${version} on this channel is older`,
    olderBody: 'Choose "Install" in the menu bar icon or run `remote-harness update` to switch to it.',
    updating: (version: string) => `Updating Remote Harness to ${version}…`,
    tray: {
      tooltip: (version: string) => `Remote Harness ${version}`,
      running: (version: string) => `Running · ${version}`,
      updateAvailable: (version: string) => `Update available: ${version}`,
      updating: 'Updating…',
      check: 'Check for updates',
      checking: 'Checking…',
      updateNow: (version: string) => `Update now (${version})`,
      installOlder: (version: string) => `Install ${version} (older)`,
      auto: 'Automatic updates',
      channel: 'Channel',
      channels: { main: 'main (stable)', development: 'development' },
      logs: 'Open logs',
      restart: 'Restart daemon',
      doctor: 'Run doctor',
      quit: 'Quit tray',
      /** Shell sections of the menu (change 65). */
      status: (machine: string, version: string, since: string) => `${machine} · ${version} · since ${since}`,
      waiting: 'Waiting for you',
      allow: 'Allow',
      always: 'Always allow',
      deny: 'Deny',
      focus: 'Open in terminal (tmux)',
      rename: 'Rename…',
      close: 'Close session',
      seeAllSessions: 'See all sessions…',
      sessionsWindowTitle: 'Sessions',
      searchSessions: 'Search sessions',
      copyPath: 'Copy path',
      renamePromptTitle: 'Rename session',
      renameConfirm: 'Rename',
      cancel: 'Cancel',
      prefsWindowTitle: 'Remote Harness Preferences',
      tabGeneral: 'General',
      tabUpdates: 'Updates',
      tabNotifications: 'Notifications',
      tabProfiles: 'Profiles',
      tabPairing: 'Pairing',
      tabAdvanced: 'Advanced',
      prefMachineName: 'Machine name',
      prefShowInMenuBar: 'Show in menu bar',
      prefStartAtLogin: 'Start at login',
      prefPushHint: 'Covers notifications and the live status on your phone',
      muteRulesHint: 'Muted sessions are managed from the app',
      updatesUnavailable: 'Updates are off in this build',
      sessions: (total: number, running: number) =>
        running > 0 ? `Sessions · ${total} · ${running} running` : `Sessions · ${total}`,
      noSessions: 'No sessions',
      ended: (count: number) => (count === 1 ? '1 ended session' : `${count} ended sessions`),
      states: { running: 'running', waiting: 'waiting', idle: 'idle', ended: 'ended' },
      worktree: 'worktree',
      phones: (count: number, push: boolean) => `Phones · ${count}${push ? ' · push ✓' : ''}`,
      newSession: 'New session…',
      pair: 'Pair a phone…',
      docs: 'Open the docs',
      prefs: 'Preferences…',
      pairMenu: 'Pair a phone',
      pairInTerminal: 'Show the pairing in the terminal',
      rotateToken: 'Rotate token…',
      rotateConfirm: 'Rotate and sign out the paired phones',
      prefsMenu: 'Preferences',
      prefPermissions: 'Show permission requests here',
      keepAwake: 'Keep the computer awake',
      keepAwakeModes: { off: 'Never', sessions: 'While sessions are active', always: 'Always' },
      prefPush: 'Push notifications',
      openConfig: 'Open the config file…',
      quitMenu: 'Quit',
      hideIcon: 'Hide the icon (the service keeps running)',
      stopService: 'Stop the service until the next login',
    },
  },
  push: {
    sessionDone: 'Session finished',
    sessionWorking: 'Session working',
    sessionWaiting: 'Session waiting for you',
    permissionPending: 'Permission pending',
    questionPending: 'The agent is waiting for your answer',
    planPending: 'Plan ready for review',
    questionReminder: 'Still waiting for your answer',
    planReminder: 'Plan still waiting for review',
    testTitle: 'Test notification',
    testBody: (host: string) => `Notifications from ${host} are working`,
  },
}

/** Shape every catalog must have (string literals widened to `string`). */
export type Messages = typeof enUS
