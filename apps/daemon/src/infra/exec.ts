import { execa } from 'execa'

export type ExecResult = { stdout: string; stderr: string; exitCode: number }
export type ExecOptions = { input?: string; cwd?: string; env?: Record<string, string>; timeoutMs?: number }

/** Runs an external program. Injected everywhere so tests can fake tmux/git/security. */
export type Executor = (file: string, args: readonly string[], options?: ExecOptions) => Promise<ExecResult>

export const execaExecutor: Executor = async (file, args, options = {}) => {
  const result = await execa(file, args, {
    input: options.input,
    cwd: options.cwd,
    env: options.env,
    timeout: options.timeoutMs ?? 10_000,
    reject: false,
    stripFinalNewline: false,
  })
  return {
    stdout: String(result.stdout ?? ''),
    stderr: String(result.stderr ?? ''),
    exitCode: result.exitCode ?? 1,
  }
}
