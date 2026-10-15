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

/**
 * Runs a program attached to this terminal (stdin/stdout/stderr) and resolves with its exit code.
 * Ctrl+C goes to the child (same process group), so SIGINT is ignored here while it runs.
 */
export async function runInteractive(
  file: string,
  args: readonly string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<number> {
  const ignore = () => {}
  process.on('SIGINT', ignore)
  try {
    // `env` is the whole environment, so callers can also remove variables.
    const result = await execa(file, args, { ...options, extendEnv: false, stdio: 'inherit', reject: false })
    // No exit code means it did not start (e.g. not on PATH): report it like the shell does.
    return result.exitCode ?? 127
  } finally {
    process.off('SIGINT', ignore)
  }
}
