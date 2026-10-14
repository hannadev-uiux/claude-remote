/** Serializes async work per key (e.g. per session) so tmux interactions never interleave. */
export class KeyedMutex {
  private readonly tails = new Map<string, Promise<unknown>>()

  run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve()
    const next = previous.then(task, task)
    const tail = next.catch(() => undefined)
    this.tails.set(key, tail)
    void tail.then(() => {
      if (this.tails.get(key) === tail) this.tails.delete(key)
    })
    return next
  }

  isBusy(key: string): boolean {
    return this.tails.has(key)
  }
}
