export function fillCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
): void {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)
}
