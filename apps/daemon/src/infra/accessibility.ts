import type { Executor } from './exec.ts'

/**
 * macOS only: probes whether this process is allowed to send Apple events to another app, by
 * addressing one that's always present. Exit 0 means it's allowed; a nonzero exit (typically
 * reporting error -1743, "not authorized to send Apple events") means it's denied.
 */
export async function probeAutomation(exec: Executor): Promise<{ exitCode: number; stderr: string }> {
  const result = await exec('osascript', ['-e', 'tell application "Finder" to get name'])
  return { exitCode: result.exitCode, stderr: result.stderr }
}
