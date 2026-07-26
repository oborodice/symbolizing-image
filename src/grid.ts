export function deriveGridRows(
  cols: number,
  camWidth: number,
  camHeight: number,
): number {
  return Math.round((cols * camHeight) / camWidth)
}

export function formatGridLabel(
  camWidth: number,
  camHeight: number,
  cols: number,
  rows: number,
): string {
  const blockWidth = camWidth / cols
  const blockHeight = camHeight / rows
  return `${cols} x ${rows} (${blockWidth.toFixed(1)} x ${blockHeight.toFixed(1)}px)`
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  camWidth: number,
  camHeight: number,
  cols: number,
  rows: number,
): void {
  const cellWidth = camWidth / cols
  const cellHeight = camHeight / rows

  ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let col = 1; col < cols; col++) {
    const x = col * cellWidth
    ctx.moveTo(x, 0)
    ctx.lineTo(x, camHeight)
  }
  for (let row = 1; row < rows; row++) {
    const y = row * cellHeight
    ctx.moveTo(0, y)
    ctx.lineTo(camWidth, y)
  }
  ctx.stroke()
}
