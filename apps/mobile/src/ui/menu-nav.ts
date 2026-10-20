/**
 * Arrow keys in a menu: the next enabled item from `current` (-1 while none is highlighted, so ↓
 * enters at the top and ↑ at the bottom), staying put at either end.
 */
export function nextEnabled(
  items: readonly { disabled?: boolean }[],
  current: number,
  delta: 1 | -1,
): number {
  const start = current === -1 && delta === -1 ? items.length : current
  for (let i = start + delta; i >= 0 && i < items.length; i += delta) {
    if (!items[i]?.disabled) return i
  }
  return current
}
