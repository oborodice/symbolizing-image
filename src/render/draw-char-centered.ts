import { getGlyph } from './glyph-cache'

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

  const cached = byFontSize.get(fontSize)
  if (cached !== undefined) {
    return cached
  }
  const fontString = `${fontSize}px "${fontFamily}"`
  byFontSize.set(fontSize, fontString)
  return fontString
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
  color: string,
  rectX: number,
  rectY: number,
  rectWidth: number,
  rectHeight: number,
): void {
  const fontString = getFontString(fontSize, fontFamily)
  const glyph = getGlyph(char, fontString, color)
  if (!glyph) {
    return
  }
  const x = rectX + (rectWidth - glyph.inkWidth) / 2
  const y = rectY + (rectHeight - glyph.inkHeight) / 2
  ctx.drawImage(
    glyph.page,
    glyph.srcX,
    glyph.srcY,
    glyph.inkWidth,
    glyph.inkHeight,
    x,
    y,
    glyph.inkWidth,
    glyph.inkHeight,
  )
}
