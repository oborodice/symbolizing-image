export function deriveGridRows(
  cols: number,
  camWidth: number,
  camHeight: number,
): number {
  return Math.round((cols * camHeight) / camWidth)
}
