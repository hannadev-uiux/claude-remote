/** Maps a `volumechange` value (-2 to 10, below 0 inaudible) to a 0-1 meter level. */
export function volumeToLevel(value: number): number {
  return Math.max(0, Math.min(1, value / 10))
}
