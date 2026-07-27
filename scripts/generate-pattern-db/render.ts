import type { SKRSContext2D } from '@napi-rs/canvas'

interface Ink {
  width: number
  height: number
  left: number
  ascent: number
}

function measureInk(
  ctx: SKRSContext2D,
  char: string,
  fontSize: number,
  fontFamily: string,
): Ink {
  ctx.font = `${fontSize}px "${fontFamily}"`
  const metrics = ctx.measureText(char)
  return {
    width: metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight,
    height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent,
    left: metrics.actualBoundingBoxLeft,
    ascent: metrics.actualBoundingBoxAscent,
  }
}

// 実際のインク（黒く塗られる領域）がキャンバスいっぱいになるよう、
// 基準サイズで測ったactualBoundingBoxからスケール・位置を逆算して描画する
export function drawCharFitted(
  ctx: SKRSContext2D,
  char: string,
  size: number,
  fontFamily: string,
): void {
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  const reference = measureInk(ctx, char, size, fontFamily)
  const fitScale = Math.min(size / reference.width, size / reference.height)
  const fitted = measureInk(ctx, char, size * fitScale, fontFamily)

  const x = (size - fitted.width) / 2 + fitted.left
  const y = (size - fitted.height) / 2 + fitted.ascent
  ctx.fillText(char, x, y)
}
