// fontFamilyは高々2種類、fontSizeもブロックの高さに応じた少数の値しか出ないため、
// 組み合わせごとに一度作った文字列をキャッシュして使い回す(呼び出しごとの新規生成を避ける)
type FontFamily = string
type FontSize = number
type FontString = string

type FontStringsBySize = Map<FontSize, FontString>
const fontStringCache = new Map<FontFamily, FontStringsBySize>()

function getFontString(fontSize: FontSize, fontFamily: FontFamily): FontString {
  let byFontSize = fontStringCache.get(fontFamily)
  if (!byFontSize) {
    byFontSize = new Map<FontSize, FontString>()
    fontStringCache.set(fontFamily, byFontSize)
  }
  let fontString = byFontSize.get(fontSize)
  if (!fontString) {
    fontString = `${fontSize}px "${fontFamily}"`
    byFontSize.set(fontSize, fontString)
  }
  return fontString
}

// ctx.measureText()が返すTextMetricsのうち、実際に使う4つの値だけを保持する
interface InkMetrics {
  left: number
  right: number
  ascent: number
  descent: number
}

// 同じ(fontString, char)の組み合わせなら計測結果は変わらないため、
// 呼び出しごとの新規TextMetrics生成を避けてキャッシュする
type InkMetricsByChar = Map<string, InkMetrics>
const inkMetricsCache = new Map<FontString, InkMetricsByChar>()

// measureTextの結果はctx.fontに実際に設定されているフォントに依存するため、
// 呼び出し前にctx.fontをfontStringと一致させておく必要がある(この関数自身は設定しない)
function getInkMetrics(
  ctx: CanvasRenderingContext2D,
  char: string,
  fontString: FontString,
): InkMetrics {
  let byChar = inkMetricsCache.get(fontString)
  if (!byChar) {
    byChar = new Map<string, InkMetrics>()
    inkMetricsCache.set(fontString, byChar)
  }
  let metrics = byChar.get(char)
  if (!metrics) {
    const measured = ctx.measureText(char)
    metrics = {
      left: measured.actualBoundingBoxLeft,
      right: measured.actualBoundingBoxRight,
      ascent: measured.actualBoundingBoxAscent,
      descent: measured.actualBoundingBoxDescent,
    }
    byChar.set(char, metrics)
  }
  return metrics
}

// 指定されたフォントサイズで、文字のインク(実際に黒く塗られる領域)が
// 指定した矩形の中央に来るよう位置だけを調整して描画する。
// 生成側(scripts/generate-pattern-db/center-char.ts)のdrawCharCenteredと同じ考え方だが、
// 正方形のcanvas全体ではなく、画面上の任意の矩形(ブロックの実際の位置・サイズ)を対象にする
export function drawCharCentered(
  ctx: CanvasRenderingContext2D,
  char: string,
  fontSize: FontSize,
  fontFamily: FontFamily,
  rectX: number,
  rectY: number,
  rectWidth: number,
  rectHeight: number,
): void {
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  const fontString = getFontString(fontSize, fontFamily)
  ctx.font = fontString

  const metrics = getInkMetrics(ctx, char, fontString)
  const inkWidth = metrics.left + metrics.right
  const inkHeight = metrics.ascent + metrics.descent

  // 空白等、インクが無い文字は何も描かない
  if (inkWidth === 0 || inkHeight === 0) {
    return
  }

  const x = rectX + (rectWidth - inkWidth) / 2 + metrics.left
  const y = rectY + (rectHeight - inkHeight) / 2 + metrics.ascent
  ctx.fillText(char, x, y)
}
