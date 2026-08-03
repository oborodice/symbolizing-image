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
