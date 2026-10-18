/**
 * Least recently used cache of image URIs, capped by total size (string length, which for base64
 * data URIs is about 4/3 of the image bytes). The newest entry is always kept, even if it alone
 * exceeds the cap.
 */
export class ImageCache {
  private readonly entries = new Map<string, string>()
  private size = 0

  constructor(private readonly maxChars: number) {}

  get(key: string): string | undefined {
    const value = this.entries.get(key)
    if (value === undefined) return undefined
    // Re-insert to mark as most recently used (Map keeps insertion order).
    this.entries.delete(key)
    this.entries.set(key, value)
    return value
  }

  set(key: string, value: string): void {
    const previous = this.entries.get(key)
    if (previous !== undefined) {
      this.size -= previous.length
      this.entries.delete(key)
    }
    this.entries.set(key, value)
    this.size += value.length
    for (const [oldest, uri] of this.entries) {
      if (this.size <= this.maxChars || oldest === key) break
      this.entries.delete(oldest)
      this.size -= uri.length
    }
  }

  get totalChars(): number {
    return this.size
  }

  has(key: string): boolean {
    return this.entries.has(key)
  }
}

/** Rejection of a queued task whose every requester let go before it started. */
export class CancelledError extends Error {
  constructor() {
    super('cancelled')
    this.name = 'CancelledError'
  }
}

type Job = {
  key: string
  task: () => Promise<unknown>
  promise: Promise<unknown>
  resolve: (value: unknown) => void
  reject: (error: unknown) => void
  waiters: number
  started: boolean
}

/**
 * Runs async tasks at most `concurrency` at a time. Waiting tasks start newest first: the latest
 * thumbnails are the ones on screen. A task requested again shares the same promise; once every
 * requester `release`s a task that has not started, it is dropped (rejected with `CancelledError`).
 */
export class FetchQueue {
  private readonly jobs = new Map<string, Job>()
  private readonly waiting: Job[] = []
  private running = 0

  constructor(private readonly concurrency: number) {}

  run<T>(key: string, task: () => Promise<T>): { promise: Promise<T>; release: () => void } {
    let job = this.jobs.get(key)
    if (!job) {
      let resolve!: (value: unknown) => void
      let reject!: (error: unknown) => void
      const promise = new Promise<unknown>((res, rej) => {
        resolve = res
        reject = rej
      })
      job = { key, task, promise, resolve, reject, waiters: 0, started: false }
      this.jobs.set(key, job)
      this.waiting.push(job)
      this.pump()
    }
    const current = job
    current.waiters++
    let released = false
    return {
      promise: current.promise as Promise<T>,
      release: () => {
        if (released) return
        released = true
        current.waiters--
        if (current.waiters > 0 || current.started) return
        this.waiting.splice(this.waiting.indexOf(current), 1)
        this.jobs.delete(current.key)
        current.reject(new CancelledError())
      },
    }
  }

  private pump(): void {
    while (this.running < this.concurrency) {
      const job = this.waiting.pop()
      if (!job) return
      job.started = true
      this.running++
      job
        .task()
        .then(job.resolve, job.reject)
        .finally(() => {
          this.running--
          this.jobs.delete(job.key)
          this.pump()
        })
    }
  }
}

/** URI React Native `Image` can render from base64 data. */
export function dataUri(mediaType: string, data: string): string {
  return `data:${mediaType};base64,${data}`
}

/** "1,2 MB" / "340 KB" in the app language, for the too-large message. */
export function formatBytes(bytes: number, locale: string): string {
  if (bytes >= 1024 * 1024) {
    const mb = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    return `${mb.format(bytes / (1024 * 1024))} MB`
  }
  return `${new Intl.NumberFormat(locale).format(Math.max(1, Math.round(bytes / 1024)))} KB`
}

/** Request timeout for an image: the usual 15 s plus time for the data at about 100 KB/s. */
export function imageTimeoutMs(bytes: number): number {
  return 15_000 + Math.ceil((bytes * 4) / 3 / 100)
}
