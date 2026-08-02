import type { BlockRect } from '../blocks'
import { binarize } from '../binarize'

export interface PatternBlock extends BlockRect {
  imageData: ImageData
}

// 全ブロックを1枚の大きいcanvas(アトラス)にまとめて描画し、getImageDataは
// アトラス全体に対して1回だけ呼ぶ。getImageDataはGPU→CPUへの同期読み出しで
// 呼び出し1回あたりのオーバーヘッドが大きく、ブロックごとに呼ぶと
// (最大1200回/フレーム)重くなるため
let atlasCtx: CanvasRenderingContext2D | null = null

function getAtlasContext(
  atlasWidth: number,
  atlasHeight: number,
): CanvasRenderingContext2D {
  if (
    atlasCtx &&
    atlasCtx.canvas.width === atlasWidth &&
    atlasCtx.canvas.height === atlasHeight
  ) {
    return atlasCtx
  }
  const canvas = document.createElement('canvas')
  canvas.width = atlasWidth
  canvas.height = atlasHeight
  // willReadFrequentlyがないとGPU-backedなcanvasになり、Chromiumで一定回数
  // getImageDataを呼んだ後にGPU側の読み戻しが暴走してFPSが1.7fps程度まで
  // 落ち込んだまま戻らなくなる現象が起きた
  atlasCtx = canvas.getContext('2d', { willReadFrequently: true })!
  atlasCtx.imageSmoothingQuality = 'high'
  return atlasCtx
}

// crop(切り出し範囲の指定)とresizeはブラウザのcanvas合成パイプラインに任せる
// (drawImage)が、読み出し(getImageData)は全ブロック分をまとめて1回だけ行う
//
// computeBlockRects(../blocks.ts)が作る各ブロックの矩形は、隙間なく敷き詰められて
// カメラ映像全体を覆っているため、ブロックごとに個別に切り出して縮小する代わりに、
// カメラ映像全体を一括で(atlasWidth, atlasHeight)へ縮小する1回のdrawImage呼び出しで
// 置き換えられる。各ブロックの境界はMath.floorの丸めで最大1pxの誤差があるため、
// 個々のブロックの拡大率は一括縮小の場合と完全には一致しないが、誤差は無視できる範囲
function buildAtlas(
  source: CanvasImageSource,
  camWidth: number,
  camHeight: number,
  atlasWidth: number,
  atlasHeight: number,
): ImageData {
  const ctx = getAtlasContext(atlasWidth, atlasHeight)

  ctx.drawImage(
    source,
    0,
    0,
    camWidth,
    camHeight,
    0,
    0,
    atlasWidth,
    atlasHeight,
  )

  return ctx.getImageData(0, 0, atlasWidth, atlasHeight)
}

// PatternBlock(とそのImageData)は毎フレーム新規生成せず使い回す。ブロック数×24px四方
// のImageDataを毎フレーム作り直すと、ホットループでのオブジェクト生成量が大きくなるため。
// rectsの要素数かsizeが変わった場合のみ作り直す
let cachedBlocks: PatternBlock[] | null = null
let cachedKey: readonly [count: number, size: number] | null = null

function getReusableBlocks(rects: BlockRect[], size: number): PatternBlock[] {
  const key = [rects.length, size] as const
  if (cachedBlocks && key.every((value, i) => value === cachedKey![i])) {
    return cachedBlocks
  }
  cachedBlocks = rects.map((rect) => ({
    ...rect,
    imageData: new ImageData(size, size),
  }))
  cachedKey = key
  return cachedBlocks
}

// 矩形領域はメモリ上で連続していないため、1行ずつコピーする
function extractBlockImageData(
  atlas: ImageData,
  col: number,
  row: number,
  size: number,
  target: ImageData,
): void {
  const rowBytes = size * 4
  for (let y = 0; y < size; y++) {
    const srcOffset = ((row * size + y) * atlas.width + col * size) * 4
    target.data.set(
      atlas.data.subarray(srcOffset, srcOffset + rowBytes),
      y * rowBytes,
    )
  }
}

function syncBlock(
  block: PatternBlock,
  rect: BlockRect,
  atlas: ImageData,
  size: number,
): void {
  block.row = rect.row
  block.col = rect.col
  block.x = rect.x
  block.y = rect.y
  block.width = rect.width
  block.height = rect.height
  extractBlockImageData(atlas, rect.col, rect.row, size, block.imageData)
}

export function extractPatternBlocks(
  source: CanvasImageSource,
  camWidth: number,
  camHeight: number,
  rects: BlockRect[],
  size: number,
  cols: number,
  rows: number,
): PatternBlock[] {
  const atlas = buildAtlas(source, camWidth, camHeight, cols * size, rows * size)

  // blocksとrectsは同じ要素数・同じ並び順であることが前提(getReusableBlocksの
  // キャッシュ条件がrects.lengthとsizeの一致を保証しているため成り立つ)
  const blocks = getReusableBlocks(rects, size)
  // .forEachのコールバック呼び出しオーバーヘッドを避けるため添字ループにしている
  // (最大5,600回/フレーム呼ばれるホットループのため)
  for (let i = 0; i < blocks.length; i++) {
    syncBlock(blocks[i], rects[i], atlas, size)
  }
  return blocks
}

export function binarizeBlocks(blocks: PatternBlock[], threshold: number): void {
  // .forEachのコールバック呼び出しオーバーヘッドを避けるため添字ループにしている
  // (最大5,600回/フレーム呼ばれるホットループのため)
  for (let i = 0; i < blocks.length; i++) {
    binarize(blocks[i].imageData, threshold)
  }
}
