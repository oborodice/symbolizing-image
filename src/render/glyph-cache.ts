// 同じ(文字・フォントサイズ・色)の組み合わせは見た目が変わらないため、fillTextで都度
// ラスタライズせず、初出時に1回だけ描いたビットマップをキャッシュして使い回す。fillText
// 呼び出し自体(JS側の記録処理)は軽いが、その後メインスレッド外(コンポジタ/GPUプロセス側)で
// 行われるラスタライズが文字サイズに比例して重くなることを、実験(fillTextの代わりに
// drawImageで貼り付けるとFPSが回復する)で確認済み
//
// 文字ごとに個別のcanvas要素を大量に作るのではなく、pattern-block.tsのatlasCtxと同じ
// 「1枚の大きいcanvasに複数の領域をまとめて詰め込む」方式にする。個別canvasを大量に
// 作る実装を最初に試したところ、ノイズ動画のような構造を持たない入力ではパターンDB
// (約10,584件)の大半に相当する数のcanvasが短時間で生成され、Chromiumが古いcanvasの
// 中身を黙って空にする(evictする)現象が起きて、一部の文字が描画されなくなる不具合が出た
type FontString = string

const ATLAS_SIZE = 1024

export interface Glyph {
  page: HTMLCanvasElement
  srcX: number
  srcY: number
  inkWidth: number
  inkHeight: number
}

// パッキング中のページと、次にどこへ詰めるかを示すカーソル(現在の行のx、行の開始y、
// 行の高さ)。ページが縦方向にも収まらなくなったら新しいページに切り替える
let packPage: HTMLCanvasElement | null = null
let cursorX = 0
let cursorY = 0
let cursorRowHeight = 0

function startNewPackPage(): HTMLCanvasElement {
  const page = document.createElement('canvas')
  page.width = ATLAS_SIZE
  page.height = ATLAS_SIZE
  packPage = page
  cursorX = 0
  cursorY = 0
  cursorRowHeight = 0
  return page
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

  const cached = byChar.get(char)
  if (cached !== undefined) {
    return cached
  }
  const measured = ctx.measureText(char)
  const metrics: InkMetrics = {
    left: measured.actualBoundingBoxLeft,
    right: measured.actualBoundingBoxRight,
    ascent: measured.actualBoundingBoxAscent,
    descent: measured.actualBoundingBoxDescent,
  }
  byChar.set(char, metrics)
  return metrics
}

// widthxheightの領域をアトラス内に確保し、そこへ描画してよい(page, x, y)を返す。
// 1文字がページ全体より大きい場合は、パッキング用ページとは無関係の専用ページを割り当てる
// (パッキング用カーソルの状態には影響させない。他のグリフと隣接しないため余白も不要)
function allocateSlot(
  width: number,
  height: number,
): { page: HTMLCanvasElement; x: number; y: number } {
  if (width > ATLAS_SIZE || height > ATLAS_SIZE) {
    const page = document.createElement('canvas')
    page.width = width
    page.height = height
    return { page, x: 0, y: 0 }
  }

  // 隣接するグリフの間に空ける余白。fillTextのアンチエイリアスはインクの実サイズ(measureText
  // が返す範囲)よりわずかににじむことがあり、隙間無く詰めると、1文字だけをdrawImageで
  // 切り出した際に隣のグリフのにじみを巻き込んでしまう(文字の周りに線が入って見える不具合の原因)
  const GLYPH_PADDING = 2

  // 呼び出し元のbuildGlyphが必ず先にpackPageを用意しているため、ここではnullにならない
  if (cursorX + width + GLYPH_PADDING > ATLAS_SIZE) {
    cursorX = 0
    cursorY += cursorRowHeight
    cursorRowHeight = 0
  }
  if (cursorY + height + GLYPH_PADDING > ATLAS_SIZE) {
    startNewPackPage()
  }

  const slot = { page: packPage!, x: cursorX, y: cursorY }
  cursorX += width + GLYPH_PADDING
  cursorRowHeight = Math.max(cursorRowHeight, height + GLYPH_PADDING)
  return slot
}

function buildGlyph(char: string, fontString: FontString, color: string): Glyph | null {
  // measureTextの結果はctx.fontと文字だけで決まり、contextがどのcanvasのものかには
  // 依存しない。そのため計測専用のcontextを別途用意せず、既存のパッキング用ページ
  // (無ければここで新規作成する)のcontextをそのまま流用する。この文字が実際にどのページの
  // どの位置に描かれるかは、この後のallocateSlotが改めて決める(このページとは限らない)
  if (!packPage) {
    startNewPackPage()
  }
  const measureCtx = packPage!.getContext('2d')!
  measureCtx.font = fontString
  const metrics = getInkMetrics(measureCtx, char, fontString)
  const inkWidth = metrics.left + metrics.right
  const inkHeight = metrics.ascent + metrics.descent

  // 空白等、インクが無い文字はビットマップ化しても意味がないため、キャッシュせず「無し」を記録する
  if (inkWidth === 0 || inkHeight === 0) {
    return null
  }

  const width = Math.ceil(inkWidth)
  const height = Math.ceil(inkHeight)
  const slot = allocateSlot(width, height)

  const ctx = slot.page.getContext('2d')!
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = fontString
  ctx.fillStyle = color
  ctx.fillText(char, slot.x + metrics.left, slot.y + metrics.ascent)

  return { page: slot.page, srcX: slot.x, srcY: slot.y, inkWidth: width, inkHeight: height }
}

type GlyphCacheKey = string
const glyphCache = new Map<GlyphCacheKey, Glyph | null>()

export function getGlyph(char: string, fontString: FontString, color: string): Glyph | null {
  const key = `${char} ${fontString} ${color}`
  const cached = glyphCache.get(key)
  if (cached !== undefined) {
    return cached
  }
  const glyph = buildGlyph(char, fontString, color)
  glyphCache.set(key, glyph)
  return glyph
}
