/** Markdown pages are bundled as strings by Vite (`?raw`), both in the Worker build and in Vitest. */
declare module '*.md?raw' {
  const content: string
  export default content
}

/** The installers at the repository root, bundled the same way (served by `/install`). */
declare module '*.sh?raw' {
  const content: string
  export default content
}
declare module '*.ps1?raw' {
  const content: string
  export default content
}
