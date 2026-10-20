import type { ExecStep } from '../../infra/desktop.ts'
import type { Platform } from '../../infra/platform.ts'

export type TerminalAppId = 'iterm2' | 'ghostty' | 'wezterm' | 'kitty' | 'alacritty' | 'terminal'

type TerminalApp = {
  id: TerminalAppId
  /** Name(s) as listed by `tell application "System Events" to get name of every process`. */
  processNames: readonly string[]
  activate(): ExecStep
  /** Opens a new window running `shellCommand` as its initial program. */
  openRunning(shellCommand: string): ExecStep
}

function appleScriptString(value: string): string {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
}

export function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`
}

/** Shell command that attaches to `paneId`'s session, window and pane (a pane id resolves all three). */
export function attachCommand(paneId: string): string {
  const q = shellQuote(paneId)
  return `tmux attach -t ${q} \\; select-window -t ${q} \\; select-pane -t ${q}`
}

/** Darwin terminal apps, in the order they are preferred when more than one is running. */
export const DARWIN_TERMINAL_APPS: readonly TerminalApp[] = [
  {
    id: 'iterm2',
    processNames: ['iTerm2'],
    activate: () => ({ file: 'osascript', args: ['-e', 'tell application "iTerm2" to activate'] }),
    openRunning: (cmd) => ({
      file: 'osascript',
      args: [
        '-e',
        `tell application "iTerm2" to create window with default profile command ${appleScriptString(cmd)}`,
      ],
    }),
  },
  {
    id: 'ghostty',
    processNames: ['Ghostty'],
    activate: () => ({ file: 'open', args: ['-a', 'Ghostty'] }),
    openRunning: (cmd) => ({ file: 'open', args: ['-na', 'Ghostty', '--args', '-e', 'sh', '-c', cmd] }),
  },
  {
    id: 'wezterm',
    processNames: ['wezterm-gui', 'WezTerm'],
    activate: () => ({ file: 'open', args: ['-a', 'WezTerm'] }),
    openRunning: (cmd) => ({ file: 'wezterm', args: ['start', '--', 'sh', '-c', cmd] }),
  },
  {
    id: 'kitty',
    processNames: ['kitty'],
    activate: () => ({ file: 'open', args: ['-a', 'kitty'] }),
    openRunning: (cmd) => ({ file: 'open', args: ['-na', 'kitty', '--args', 'sh', '-c', cmd] }),
  },
  {
    id: 'alacritty',
    processNames: ['Alacritty'],
    activate: () => ({ file: 'open', args: ['-a', 'Alacritty'] }),
    openRunning: (cmd) => ({ file: 'open', args: ['-na', 'Alacritty', '--args', '-e', 'sh', '-c', cmd] }),
  },
  {
    id: 'terminal',
    processNames: ['Terminal'],
    activate: () => ({ file: 'osascript', args: ['-e', 'tell application "Terminal" to activate'] }),
    openRunning: (cmd) => ({
      file: 'osascript',
      args: [
        '-e',
        `tell application "Terminal" to do script ${appleScriptString(cmd)}`,
        '-e',
        'tell application "Terminal" to activate',
      ],
    }),
  },
]

/** The first app (in preference order) currently running, or Terminal.app (always installed on macOS). */
export function pickTerminalApp(runningProcessNames: readonly string[]): TerminalApp {
  const running = DARWIN_TERMINAL_APPS.find((app) =>
    app.processNames.some((name) => runningProcessNames.includes(name)),
  )
  return running ?? DARWIN_TERMINAL_APPS[DARWIN_TERMINAL_APPS.length - 1]!
}

/**
 * What to run so a session's tmux pane shows on screen. `hasAttachedClient` means some terminal
 * is already attached to the session's tmux server (possibly to a different session) and only
 * needs switching and raising; otherwise a new terminal window is opened running `tmux attach`.
 */
export function planShowInTerminal(input: {
  platform: Platform
  wsl: boolean
  hasAttachedClient: boolean
  /** macOS only; ignored elsewhere. */
  runningProcessNames: readonly string[]
  /** `$TERMINAL` on Linux, when set. */
  terminalEnv: string | null
  paneId: string
}): ExecStep[] {
  const { platform, wsl, hasAttachedClient, runningProcessNames, terminalEnv, paneId } = input
  const cmd = attachCommand(paneId)
  if (platform === 'darwin') {
    const app = pickTerminalApp(runningProcessNames)
    return [hasAttachedClient ? app.activate() : app.openRunning(cmd)]
  }
  if (wsl) {
    // No portable way to raise a specific window from inside WSL; switch-client already ran.
    return hasAttachedClient ? [] : [{ file: 'wt.exe', args: ['wsl.exe', 'sh', '-c', cmd] }]
  }
  if (hasAttachedClient) return []
  const terminal = terminalEnv || 'x-terminal-emulator'
  return [{ file: terminal, args: ['-e', 'sh', '-c', `${cmd}; exec "$SHELL"`] }]
}
