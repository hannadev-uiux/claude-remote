/**
 * Reference catalog: its shape is the `Messages` type, and `pt-BR`/`es-ES` must match it.
 * Interpolation and plurals are functions. Product names (Claude Code, Claude Remote, Tailscale,
 * tmux) are never translated. Log messages are not here: logs stay in English.
 */
export const enUS = {
  cli: {
    description: 'Claude Remote daemon: control Claude Code sessions in tmux from your phone',
    help: 'display help for command',
    version: 'output the version number',
    buildMissing: 'Build not found: run `pnpm --filter @claude-remote/daemon build`.',
    unsupportedPlatform: (platform: string, supported: string) =>
      `Unsupported system (${platform}). Claude Remote runs on ${supported}.`,
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
      simulatorHint:
        'To test in the simulator on this Mac: `claude-remote start --dev` and `claude-remote pair --dev`.',
      scan: 'Scan it with the Claude Remote app. Do not share this code.',
    },
    setup: {
      description: 'wizard: choose accounts and aliases, install hooks and the service, pair the iPhone',
      yes: 'no questions: keep the config or use the accounts found',
      noService: 'do not install the background service',
      lang: (codes: string) => `language (${codes}); skips the question`,
      invalidLang: (value: string, codes: string) => `Unknown language "${value}". Use one of: ${codes}.`,
      interrupted:
        'Setup interrupted. Everything shown with ✓ is done; run `claude-remote setup` again whenever you like.',
    },
    rotateToken: {
      description: 'generate a new token and drop existing connections',
      rotated: 'Token rotated; connections closed.',
      rotatedOffline: 'Token rotated (the daemon is not running).',
      pairAgain: 'Run `claude-remote pair` to pair again.',
    },
    doctor: {
      description: 'check dependencies and configuration',
      notOnPath: 'not found in PATH',
      tailscaleMissing: 'no 100.x interface found',
      profile: (id: string, configDir: string) => `profile ${id} (${configDir})`,
      dirMissing: 'directory does not exist',
      daemonRunning: 'daemon running',
      runStart: 'run `claude-remote start`',
      token: (store: string) => `token ${store}`,
      tokenStores: {
        keychain: 'in the macOS Keychain',
        secretTool: 'in the Secret Service (secret-tool)',
        file: (path: string) => `in the file ${path} (0600)`,
      },
      runPair: 'run `claude-remote pair`',
    },
    install: {
      description: 'install launchers, PATH in ~/.zshrc and hooks in the configured profiles (no questions)',
      openTerminal: 'Open a new terminal (or `source ~/.zshrc`) and use the launchers instead of `claude`.',
    },
    uninstall: {
      description: 'remove launchers, the ~/.zshrc block and the installed hooks',
      zshrcRemoved: 'block removed from ~/.zshrc',
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
        'systemd user services are not available here (`systemctl --user` failed). Run `claude-remote start` whenever you want to use it (e.g. in a tmux window).',
      lingerHint:
        'Lingering is off: the service stops when you log out. To keep it running and start it at boot: `loginctl enable-linger $USER`',
      linger: (enabled: boolean): string =>
        enabled
          ? 'lingering on (keeps running after logout, starts at boot)'
          : 'lingering off (stops at logout)',
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
    shortcut: (path: string) => `shortcut ${path}`,
    zshrcPath: 'PATH in ~/.zshrc',
    hooksIn: (path: string) => `hooks in ${path}`,
    launcherRemoved: (id: string) => `launcher ${id} removed`,
    hooksRemovedFrom: (path: string) => `hooks removed from ${path}`,
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
      title: 'Welcome to Claude Remote!',
      intro1: "Let's get this Mac ready so you can follow and control",
      intro2: 'Claude Code from your iPhone. It takes about 2 minutes.',
      footer: (version: string) => `v${version} · ↑/↓ to choose · Enter to confirm · Ctrl+C to quit`,
    },
    steps: {
      accounts: 'Claude Code accounts',
      installing: 'Installing launchers, PATH and hooks',
      service: 'Background service',
      tailscale: 'Tailscale and iPhone',
    },
    noAccounts: 'No Claude Code account found. Run `claude` once to log in, then `claude-remote setup`.',
    confirmSave: 'Save and install?',
    nothingChanged: 'Nothing was changed.',
    serviceQuestion: 'Start Claude Remote with the Mac (and restart it if it crashes)?',
    noService: 'No service: run `claude-remote start` whenever you want to use it.',
    serviceUnavailable:
      '  systemd user services are not available here (`systemctl --user`).\n' +
      '  Run `claude-remote start` whenever you want to use it (e.g. in a tmux window or from your init system).',
    lingerQuestion:
      'Keep Claude Remote running after you log out and start it at boot? (loginctl enable-linger)',
    lingerEnabled: 'lingering enabled (loginctl enable-linger)',
    lingerFailed:
      "  Couldn't enable lingering. Run `sudo loginctl enable-linger $USER` to keep the daemon running after logout.",
    lingerSkipped:
      '  Without lingering the daemon stops when you log out. Enable it later with `loginctl enable-linger $USER`.',
    tailscaleIntro:
      '  The Mac and the iPhone talk over a private Tailscale network (free), from anywhere.\n' +
      '  1. On the Mac: install it from https://tailscale.com/download/mac (or `brew install --cask tailscale`) and sign in\n' +
      '  2. On the iPhone: install "Tailscale" from the App Store and sign in with the same account',
    tailscaleQuestion: 'Is Tailscale connected on the Mac?',
    tailscaleRetry: "I've connected it, check again",
    tailscaleSkip: "I'll do it later",
    tailscaleNotYet: '  Still no Tailscale interface (100.x) found.',
    iphoneHint:
      '  On the iPhone: install the Claude Remote app and Tailscale (same account) and tap "QR code".',
    showQr: 'Show the pairing QR code now?',
    done: {
      installed: 'Claude Remote installed.',
      openTerminal: (command: string) => `1. Open a new terminal (or ${command})`,
      useAliases: (aliases: string, claude: string) =>
        `2. Use ${aliases} instead of ${claude}, with the same arguments`,
      pairIfNeeded: (command: string) => `3. Pair with ${command} if you haven't yet`,
      connectAndPair: (command: string) => `3. Connect Tailscale and run ${command}`,
      footer: 'claude-remote doctor checks it all · claude-remote setup edits accounts',
    },
    accounts: {
      explain:
        '  Each Claude Code account lives in a configuration folder (CLAUDE_CONFIG_DIR).\n' +
        '  For each one you choose a command (alias) that opens it in tmux, ready for the phone.',
      which: 'Which accounts do you want to control from the iPhone?',
      noneFound: "  No Claude Code account found on this Mac; let's create one.",
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
  },
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
    denied: 'Denied by Claude Remote',
  },
  push: {
    sessionDone: 'Session finished',
    sessionWaiting: 'Session waiting for you',
    permissionPending: 'Permission pending',
  },
}

/** Shape every catalog must have (string literals widened to `string`). */
export type Messages = typeof enUS
