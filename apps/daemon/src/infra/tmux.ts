import type { Executor } from './exec.ts'

export type PaneInfo = { paneId: string; pid: number; sessionName: string; windowName: string; cwd: string }

export class TmuxError extends Error {
  override name = 'TmuxError'
}

const NO_SERVER = /no server running|error connecting to|no current client|can't find/i

/** Single place that knows the tmux CLI. Every call goes through the injected executor. */
export class TmuxClient {
  constructor(
    private readonly exec: Executor,
    private readonly bin = 'tmux',
  ) {}

  private async run(args: string[], input?: string): Promise<string> {
    // Without a UTF-8 locale (e.g. under launchd) tmux replaces the tabs in -F output with "_";
    // -u makes it assume UTF-8 regardless of LANG/LC_*.
    const result = await this.exec(this.bin, ['-u', ...args], input === undefined ? undefined : { input })
    if (result.exitCode !== 0) throw new TmuxError(result.stderr.trim() || `tmux ${args[0]} failed`)
    return result.stdout
  }

  /** Lists all panes; an absent tmux server means no panes rather than an error. */
  async listPanes(): Promise<PaneInfo[]> {
    let out: string
    try {
      out = await this.run([
        'list-panes',
        '-a',
        '-F',
        '#{pane_id}\t#{pane_pid}\t#{session_name}\t#{window_name}\t#{pane_current_path}',
      ])
    } catch (error) {
      if (error instanceof TmuxError && NO_SERVER.test(error.message)) return []
      throw error
    }
    return out
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [paneId = '', pid = '0', sessionName = '', windowName = '', cwd = ''] = line.split('\t')
        return { paneId, pid: Number(pid), sessionName, windowName, cwd }
      })
  }

  async hasPane(paneId: string): Promise<boolean> {
    return (await this.listPanes()).some((p) => p.paneId === paneId)
  }

  /** Visible content of the pane; `escapes` keeps ANSI colour sequences. */
  async capturePane(paneId: string, options: { escapes?: boolean } = {}): Promise<string> {
    return this.run(['capture-pane', '-p', ...(options.escapes ? ['-e'] : []), '-t', paneId])
  }

  async paneSize(paneId: string): Promise<{ cols: number; rows: number }> {
    const out = await this.run(['display-message', '-p', '-t', paneId, '#{pane_width} #{pane_height}'])
    const [cols = '80', rows = '24'] = out.trim().split(' ')
    return { cols: Number(cols) || 80, rows: Number(rows) || 24 }
  }

  /** Pane size and visible content (with colours) in a single tmux invocation. */
  async captureWithSize(paneId: string): Promise<{ cols: number; rows: number; text: string }> {
    const out = await this.run([
      'display-message',
      '-p',
      '-t',
      paneId,
      '#{pane_width} #{pane_height}',
      ';',
      'capture-pane',
      '-p',
      '-e',
      '-t',
      paneId,
    ])
    const newline = out.indexOf('\n')
    const [cols = '80', rows = '24'] = out.slice(0, newline).trim().split(' ')
    return { cols: Number(cols) || 80, rows: Number(rows) || 24, text: out.slice(newline + 1) }
  }

  /** Sends tmux key names (Enter, Escape, BTab, C-c...). */
  async sendKeys(paneId: string, keys: readonly string[]): Promise<void> {
    await this.run(['send-keys', '-t', paneId, ...keys])
  }

  /** Kills a pane (its window closes when it was the last one). */
  async killPane(paneId: string): Promise<void> {
    await this.run(['kill-pane', '-t', paneId])
  }

  /** Brings a pane to the front of its tmux client: its window, then the pane itself. */
  async focusPane(paneId: string): Promise<void> {
    await this.run(['select-window', '-t', paneId])
    await this.run(['select-pane', '-t', paneId])
  }

  /** Terminal clients currently attached to `target`'s session; `[]` when no tmux server runs. */
  async listClients(target: string): Promise<{ tty: string }[]> {
    let out: string
    try {
      out = await this.run(['list-clients', '-t', target, '-F', '#{client_tty}'])
    } catch (error) {
      if (error instanceof TmuxError && NO_SERVER.test(error.message)) return []
      throw error
    }
    return out
      .split('\n')
      .filter(Boolean)
      .map((tty) => ({ tty }))
  }

  /** Switches one attached client (by tty) to `target`'s session, without touching other clients. */
  async switchClient(clientTty: string, target: string): Promise<void> {
    await this.run(['switch-client', '-c', clientTty, '-t', target])
  }

  /** Types text literally, key by key. */
  async sendLiteral(paneId: string, text: string): Promise<void> {
    await this.run(['send-keys', '-t', paneId, '-l', '--', text])
  }

  /** Pastes text as one bracketed paste through a named buffer (deleted after use). */
  async pasteText(paneId: string, text: string, bufferName: string): Promise<void> {
    await this.run(['load-buffer', '-b', bufferName, '-'], text)
    await this.run(['paste-buffer', '-p', '-d', '-b', bufferName, '-t', paneId])
  }
}
