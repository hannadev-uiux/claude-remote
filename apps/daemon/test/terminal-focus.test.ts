import { describe, expect, test } from 'vitest'
import { showInTerminal } from '../src/features/pane/show-in-terminal.ts'
import { attachCommand, pickTerminalApp, planShowInTerminal } from '../src/features/pane/terminal-focus.ts'
import { createDesktop } from '../src/infra/desktop.ts'
import { TmuxClient } from '../src/infra/tmux.ts'
import { fakeExecutor } from './helpers.ts'

describe('TmuxClient.listClients', () => {
  test('parses one client per line', async () => {
    const exec = fakeExecutor(() => ({ stdout: '/dev/ttys001\n/dev/ttys002\n' }))
    expect(await new TmuxClient(exec).listClients('%1')).toEqual([
      { tty: '/dev/ttys001' },
      { tty: '/dev/ttys002' },
    ])
    expect(exec.calls[0]?.args).toEqual(['list-clients', '-t', '%1', '-F', '#{client_tty}'])
  })

  test('is empty with no attached client', async () => {
    const exec = fakeExecutor(() => ({ stdout: '' }))
    expect(await new TmuxClient(exec).listClients('%1')).toEqual([])
  })

  test('is empty rather than an error when no tmux server runs', async () => {
    const exec = fakeExecutor(() => ({ exitCode: 1, stderr: 'no server running on /tmp/tmux-0/default' }))
    expect(await new TmuxClient(exec).listClients('%1')).toEqual([])
  })
})

describe('TmuxClient.switchClient', () => {
  test('switches the given client to the target', async () => {
    const exec = fakeExecutor()
    await new TmuxClient(exec).switchClient('/dev/ttys001', '%1')
    expect(exec.calls[0]?.args).toEqual(['switch-client', '-c', '/dev/ttys001', '-t', '%1'])
  })
})

describe('attachCommand', () => {
  test('attaches and selects the pane for every clause', () => {
    expect(attachCommand('%1')).toBe("tmux attach -t '%1' \\; select-window -t '%1' \\; select-pane -t '%1'")
  })
})

describe('pickTerminalApp', () => {
  test('picks the highest-priority app that is running', () => {
    expect(pickTerminalApp(['Finder', 'WezTerm', 'iTerm2']).id).toBe('iterm2')
    expect(pickTerminalApp(['Finder', 'wezterm-gui']).id).toBe('wezterm')
  })

  test('falls back to Terminal.app when nothing else is running', () => {
    expect(pickTerminalApp([]).id).toBe('terminal')
    expect(pickTerminalApp(['Finder', 'Safari']).id).toBe('terminal')
  })
})

describe('planShowInTerminal', () => {
  const base = {
    wsl: false,
    hasAttachedClient: false,
    runningProcessNames: [] as string[],
    terminalEnv: null,
    paneId: '%1',
  }

  test('darwin, no attached client: opens the detected app with the attach command', () => {
    const steps = planShowInTerminal({ ...base, platform: 'darwin', runningProcessNames: ['Ghostty'] })
    expect(steps).toEqual([
      { file: 'open', args: ['-na', 'Ghostty', '--args', '-e', 'sh', '-c', attachCommand('%1')] },
    ])
  })

  test('darwin, attached client: activates the detected app instead of opening a window', () => {
    const steps = planShowInTerminal({
      ...base,
      platform: 'darwin',
      hasAttachedClient: true,
      runningProcessNames: ['kitty'],
    })
    expect(steps).toEqual([{ file: 'open', args: ['-a', 'kitty'] }])
  })

  test('linux, no attached client, $TERMINAL set: uses it over x-terminal-emulator', () => {
    const steps = planShowInTerminal({ ...base, platform: 'linux', terminalEnv: 'alacritty' })
    expect(steps).toEqual([
      { file: 'alacritty', args: ['-e', 'sh', '-c', `${attachCommand('%1')}; exec "$SHELL"`] },
    ])
  })

  test('linux, no $TERMINAL: falls back to x-terminal-emulator', () => {
    const steps = planShowInTerminal({ ...base, platform: 'linux' })
    expect(steps[0]?.file).toBe('x-terminal-emulator')
  })

  test('linux, attached client: nothing to run (no portable window-raise)', () => {
    expect(planShowInTerminal({ ...base, platform: 'linux', hasAttachedClient: true })).toEqual([])
  })

  test('wsl, no attached client: opens Windows Terminal over wsl.exe', () => {
    const steps = planShowInTerminal({ ...base, platform: 'linux', wsl: true })
    expect(steps).toEqual([{ file: 'wt.exe', args: ['wsl.exe', 'sh', '-c', attachCommand('%1')] }])
  })

  test('wsl, attached client: nothing to run', () => {
    expect(planShowInTerminal({ ...base, platform: 'linux', wsl: true, hasAttachedClient: true })).toEqual([])
  })
})

describe('showInTerminal (orchestration)', () => {
  test('switches every attached client, focuses the pane, then activates the running app', async () => {
    const exec = fakeExecutor((call) => {
      if (call.args[0] === 'list-clients') return { stdout: '/dev/ttys001\n/dev/ttys002\n' }
      if (call.file === 'osascript' && call.args.some((a) => a.includes('System Events')))
        return { stdout: 'Finder, iTerm2, Safari' }
      return undefined
    })
    const tmux = new TmuxClient(exec)
    const desktop = createDesktop(exec, 'darwin', { wsl: false })
    await showInTerminal(tmux, desktop, 'darwin', false, '%1')
    expect(exec.calls.map((c) => c.args)).toEqual([
      ['list-clients', '-t', '%1', '-F', '#{client_tty}'],
      ['switch-client', '-c', '/dev/ttys001', '-t', '%1'],
      ['switch-client', '-c', '/dev/ttys002', '-t', '%1'],
      ['select-window', '-t', '%1'],
      ['select-pane', '-t', '%1'],
      ['-e', 'tell application "System Events" to get name of every process whose background only is false'],
      ['-e', 'tell application "iTerm2" to activate'],
    ])
  })

  test('opens a new window when nothing is attached, without switching any client', async () => {
    const exec = fakeExecutor((call) => {
      if (call.args[0] === 'list-clients') return { stdout: '' }
      if (call.file === 'osascript' && call.args.some((a) => a.includes('System Events')))
        return { stdout: '' }
      return undefined
    })
    const tmux = new TmuxClient(exec)
    const desktop = createDesktop(exec, 'darwin', { wsl: false })
    await showInTerminal(tmux, desktop, 'darwin', false, '%1')
    const fileCalls = exec.calls.map((c) => c.file)
    expect(fileCalls).not.toContain('switch-client')
    const last = exec.calls[exec.calls.length - 1]
    expect(last?.file).toBe('osascript')
    expect(last?.args[1]).toContain('tell application "Terminal" to do script')
  })

  test('propagates a failure instead of swallowing it', async () => {
    const exec = fakeExecutor((call) => {
      if (call.args[0] === 'list-clients') return { stdout: '' }
      if (call.file === 'osascript' && call.args.some((a) => a.includes('System Events')))
        return { stdout: '' }
      if (call.file === 'osascript') return { exitCode: 1, stderr: 'not authorized' }
      return undefined
    })
    const tmux = new TmuxClient(exec)
    const desktop = createDesktop(exec, 'darwin', { wsl: false })
    await expect(showInTerminal(tmux, desktop, 'darwin', false, '%1')).rejects.toThrow('not authorized')
  })
})
