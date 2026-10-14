import { randomBytes } from 'node:crypto'
import { chmod, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export async function readJsonFile(path: string): Promise<unknown | undefined> {
  let text: string
  try {
    text = await readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  }
  return JSON.parse(text) as unknown
}

/** Writes through a temp file + rename so readers never see a half-written file. */
export async function writeFileAtomic(path: string, content: string, mode?: number): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const tmp = `${path}.${randomBytes(4).toString('hex')}.tmp`
  await writeFile(tmp, content, mode === undefined ? undefined : { mode })
  if (mode !== undefined) await chmod(tmp, mode)
  await rename(tmp, path)
}

export async function writeJsonAtomic(path: string, data: unknown, mode?: number): Promise<void> {
  await writeFileAtomic(path, `${JSON.stringify(data, null, 2)}\n`, mode)
}

export async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}
