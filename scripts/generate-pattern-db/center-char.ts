import type { SKRSContext2D } from '@napi-rs/canvas'

// 指定されたフォントサイズで、文字のインク（実際に黒く塗られる領域）が
// キャンバスの中央に来るよう位置だけを調整して描画する。
// フォントサイズ自体はここでは変えない（文字ごとの拡大・縮小はしない）。
// これにより、文字ごとの自然な大きさの違い（疎密）がそのまま保たれる
export function drawCharCentered(
  ctx: SKRSContext2D,
  char: string,
  fontSize: number,
  fontFamily: string,
  canvasSize: number,
): void {
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `${fontSize}px "${fontFamily}"`

  const metrics = ctx.measureText(char)
  const width = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight
  const height =
    metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent

  // 空白等、インクが無い文字は何も描かず抜ける（白紙のまま）
  if (width === 0 || height === 0) {
    return
  }

  const x = (canvasSize - width) / 2 + metrics.actualBoundingBoxLeft
  const y = (canvasSize - height) / 2 + metrics.actualBoundingBoxAscent
  ctx.fillText(char, x, y)
}
