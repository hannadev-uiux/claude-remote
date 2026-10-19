import {
  type DaemonUpdateChannel,
  type DaemonUpdateRun,
  DaemonUpdateRunSchema,
  type DaemonUpdateStep,
} from '@remote-harness/protocol'
import { readJsonFile, writeJsonAtomic } from '../../infra/fs.ts'

/** A run left at `fetching` / `building` longer than this was interrupted (machine off, crash). */
export const STALE_RUN_MS = 30 * 60 * 1000

export function isFinished(step: DaemonUpdateStep): boolean {
  return step === 'done' || step === 'failed'
}

export async function readRun(path: string): Promise<DaemonUpdateRun | null> {
  const parsed = DaemonUpdateRunSchema.safeParse(await readJsonFile(path).catch(() => undefined))
  return parsed.success ? parsed.data : null
}

export function writeRun(path: string, run: DaemonUpdateRun): Promise<void> {
  return writeJsonAtomic(path, run)
}

export function startRun(o: { channel: DaemonUpdateChannel; from: string; now: Date }): DaemonUpdateRun {
  return {
    channel: o.channel,
    from: o.from,
    to: null,
    commit: null,
    step: 'fetching',
    startedAt: o.now.toISOString(),
    finishedAt: null,
  }
}

/** Moves a run to `step`; final steps get `finishedAt`. */
export function advanceRun(
  run: DaemonUpdateRun,
  step: DaemonUpdateStep,
  now: Date,
  patch: Partial<Pick<DaemonUpdateRun, 'to' | 'commit' | 'error' | 'rolledBack'>> = {},
): DaemonUpdateRun {
  return { ...run, ...patch, step, finishedAt: isFinished(step) ? now.toISOString() : null }
}

/**
 * What a starting daemon makes of the last run: `restarting` means the new version is the one
 * starting (done); an old unfinished run was interrupted. Null when nothing changes.
 */
export function reconcileRun(run: DaemonUpdateRun, version: string, now: Date): DaemonUpdateRun | null {
  if (run.step === 'restarting') return advanceRun(run, 'done', now, { to: version })
  if (isFinished(run.step)) return null
  if (now.getTime() - Date.parse(run.startedAt) < STALE_RUN_MS) return null
  return advanceRun(run, 'failed', now, { error: 'interrupted' })
}

/**
 * Records the steps of one `remote-harness update` run. Writing never fails the update: a broken
 * record only costs the app its progress view.
 */
export class RunRecorder {
  constructor(
    private readonly path: string,
    private run: DaemonUpdateRun,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Continues the run the daemon started (same channel), or starts a new record. */
  static async open(o: {
    path: string
    channel: DaemonUpdateChannel
    from: string
    now?: () => Date
  }): Promise<RunRecorder> {
    const now = o.now ?? (() => new Date())
    const existing = await readRun(o.path)
    const fresh =
      existing &&
      existing.step === 'fetching' &&
      existing.channel === o.channel &&
      now().getTime() - Date.parse(existing.startedAt) < STALE_RUN_MS
    const recorder = new RunRecorder(
      o.path,
      fresh ? existing : startRun({ channel: o.channel, from: o.from, now: now() }),
      now,
    )
    await recorder.save()
    return recorder
  }

  get current(): DaemonUpdateRun {
    return this.run
  }

  async step(
    step: DaemonUpdateStep,
    patch: Partial<Pick<DaemonUpdateRun, 'to' | 'commit' | 'error' | 'rolledBack'>> = {},
  ): Promise<void> {
    this.run = advanceRun(this.run, step, this.now(), patch)
    await this.save()
  }

  private async save(): Promise<void> {
    await writeRun(this.path, this.run).catch(() => undefined)
  }
}
