/** Token bucket per key, kept in this instance's memory (best effort across instances). */
export class RateLimiter {
  private readonly buckets = new Map<string, { tokens: number; at: number }>()

  constructor(
    private readonly capacity = 30,
    private readonly refillPerMs = 1 / 2000,
    private readonly maxKeys = 10_000,
  ) {}

  /** Takes one token for `key`; false when the bucket is empty. */
  take(key: string, now: number): boolean {
    const bucket = this.buckets.get(key) ?? { tokens: this.capacity, at: now }
    bucket.tokens = Math.min(this.capacity, bucket.tokens + (now - bucket.at) * this.refillPerMs)
    bucket.at = now
    if (!this.buckets.has(key)) {
      if (this.buckets.size >= this.maxKeys) this.buckets.clear()
      this.buckets.set(key, bucket)
    }
    if (bucket.tokens < 1) return false
    bucket.tokens -= 1
    return true
  }
}
