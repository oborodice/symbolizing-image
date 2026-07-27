// 指定されたフォントサイズで、文字のインク(実際に黒く塗られる領域)が
// 指定した矩形の中央に来るよう位置だけを調整して描画する。
// 生成側(scripts/generate-pattern-db/center-char.ts)のdrawCharCenteredと同じ考え方だが、
// 正方形のcanvas全体ではなく、画面上の任意の矩形(ブロックの実際の位置・サイズ)を対象にする
export function drawCharCentered(
  ctx: CanvasRenderingContext2D,
  char: string,
  fontSize: number,
  fontFamily: string,
  rectX: number,
  rectY: number,
  rectWidth: number,
  rectHeight: number,
): void {
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `${fontSize}px "${fontFamily}"`

  const metrics = ctx.measureText(char)
  const width = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight
  const height =
    metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent

  // 空白等、インクが無い文字は何も描かない
  if (width === 0 || height === 0) {
    return
  }

  const x = rectX + (rectWidth - width) / 2 + metrics.actualBoundingBoxLeft
  const y = rectY + (rectHeight - height) / 2 + metrics.actualBoundingBoxAscent
  ctx.fillText(char, x, y)
}
