import { describe, expect, test } from 'vitest'
import { CancelledError, dataUri, FetchQueue, formatBytes, ImageCache, imageTimeoutMs } from './image-cache'

describe('ImageCache', () => {
  test('evicts the least recently used entries over the cap', () => {
    const cache = new ImageCache(10)
    cache.set('a', 'aaaa')
    cache.set('b', 'bbbb')
    expect(cache.get('a')).toBe('aaaa') // a is now the most recent
    cache.set('c', 'cccc')
    expect(cache.has('b')).toBe(false)
    expect(cache.has('a')).toBe(true)
    expect(cache.has('c')).toBe(true)
    expect(cache.totalChars).toBe(8)
  })

  test('keeps the newest entry even when it alone is over the cap', () => {
    const cache = new ImageCache(4)
    cache.set('a', 'aa')
    cache.set('big', 'xxxxxxxx')
    expect(cache.has('a')).toBe(false)
    expect(cache.get('big')).toBe('xxxxxxxx')
  })

  test('replacing a key updates the size', () => {
    const cache = new ImageCache(100)
    cache.set('a', 'aaaa')
    cache.set('a', 'aa')
    expect(cache.totalChars).toBe(2)
  })
})

describe('FetchQueue', () => {
  const deferred = () => {
    let resolve!: (v: string) => void
    const promise = new Promise<string>((r) => {
      resolve = r
    })
    return { promise, resolve }
  }
  const tick = () => new Promise((r) => setTimeout(r, 0))

  test('runs at most `concurrency` tasks at a time, newest waiting first', async () => {
    const queue = new FetchQueue(1)
    const started: string[] = []
    const tasks = { a: deferred(), b: deferred(), c: deferred() }
    const run = (key: keyof typeof tasks) =>
      queue.run(key, () => {
        started.push(key)
        return tasks[key].promise
      }).promise
    const results = [run('a'), run('b'), run('c')]
    expect(started).toEqual(['a'])
    tasks.a.resolve('A')
    await tick()
    expect(started).toEqual(['a', 'c'])
    tasks.c.resolve('C')
    await tick()
    expect(started).toEqual(['a', 'c', 'b'])
    tasks.b.resolve('B')
    expect(await Promise.all(results)).toEqual(['A', 'B', 'C'])
  })

  test('shares the task requested twice', async () => {
    const queue = new FetchQueue(1)
    let calls = 0
    const task = async () => {
      calls++
      return 'x'
    }
    const one = queue.run('k', task)
    const two = queue.run('k', task)
    expect(one.promise).toBe(two.promise)
    await one.promise
    expect(calls).toBe(1)
  })

  test('drops a waiting task once every requester released it', async () => {
    const queue = new FetchQueue(1)
    const blocker = deferred()
    queue.run('busy', () => blocker.promise)
    let ran = false
    const first = queue.run('k', async () => {
      ran = true
      return 'x'
    })
    const second = queue.run('k', async () => 'x')
    first.release()
    second.release()
    await expect(first.promise).rejects.toBeInstanceOf(CancelledError)
    blocker.resolve('done')
    await tick()
    expect(ran).toBe(false)
  })

  test('a task still wanted by someone is kept; a started task is never dropped', async () => {
    const queue = new FetchQueue(1)
    const running = queue.run('r', async () => 'r')
    running.release()
    expect(await running.promise).toBe('r')
    const blocker = deferred()
    queue.run('busy', () => blocker.promise)
    const a = queue.run('k', async () => 'k')
    const b = queue.run('k', async () => 'k')
    a.release()
    blocker.resolve('done')
    expect(await b.promise).toBe('k')
  })

  test('a failed task frees its slot', async () => {
    const queue = new FetchQueue(1)
    await expect(queue.run('bad', () => Promise.reject(new Error('no'))).promise).rejects.toThrow('no')
    expect(await queue.run('good', async () => 'ok').promise).toBe('ok')
  })
})

test('dataUri, formatBytes and imageTimeoutMs', () => {
  expect(dataUri('image/png', 'AAAA')).toBe('data:image/png;base64,AAAA')
  expect(formatBytes(1.25 * 1024 * 1024, 'en-US')).toBe('1.3 MB')
  expect(formatBytes(1.25 * 1024 * 1024, 'pt-BR')).toBe('1,3 MB')
  expect(formatBytes(340 * 1024, 'es-ES')).toBe('340 KB')
  expect(formatBytes(10, 'en-US')).toBe('1 KB')
  expect(imageTimeoutMs(0)).toBe(15_000)
  expect(imageTimeoutMs(3 * 1024 * 1024)).toBeGreaterThan(50_000)
})
