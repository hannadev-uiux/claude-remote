/** Whether a polish result is worth showing for review, instead of inserting it straight away. */
export function shouldReview(result: { text: string; applied: boolean }, original: string): boolean {
  return result.applied && result.text.trim() !== original.trim()
}
