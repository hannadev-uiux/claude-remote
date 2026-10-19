/** Markdown pages are bundled as strings by Vite (`?raw`), both in the Worker build and in Vitest. */
declare module '*.md?raw' {
  const content: string
  export default content
}
