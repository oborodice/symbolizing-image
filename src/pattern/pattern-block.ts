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
  atlasCtx = canvas.getContext('2d')!
  atlasCtx.imageSmoothingQuality = 'high'
  return atlasCtx
}

// アトラス(1枚の大きいImageData)から1ブロック分(size x size)を切り出す。
// 矩形領域はメモリ上で連続していないため、1行ずつコピーする
function extractBlockImageData(
  atlas: ImageData,
  col: number,
  row: number,
  size: number,
): ImageData {
  const block = new ImageData(size, size)
  const rowBytes = size * 4
  for (let y = 0; y < size; y++) {
    const srcOffset = ((row * size + y) * atlas.width + col * size) * 4
    block.data.set(
      atlas.data.subarray(srcOffset, srcOffset + rowBytes),
      y * rowBytes,
    )
  }
  return block
}

// crop(切り出し範囲の指定)とresizeはブラウザのcanvas合成パイプラインに任せる
// (drawImage)が、読み出し(getImageData)は全ブロック分をまとめて1回だけ行う
export function extractPatternBlocks(
  source: CanvasImageSource,
  rects: BlockRect[],
  size: number,
  cols: number,
  rows: number,
): PatternBlock[] {
  const atlasWidth = cols * size
  const atlasHeight = rows * size
  const ctx = getAtlasContext(atlasWidth, atlasHeight)

  rects.forEach((rect) => {
    ctx.drawImage(
      source,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      rect.col * size,
      rect.row * size,
      size,
      size,
    )
  })

  const atlas = ctx.getImageData(0, 0, atlasWidth, atlasHeight)

  return rects.map((rect) => ({
    ...rect,
    imageData: extractBlockImageData(atlas, rect.col, rect.row, size),
  }))
}

export function binarizeBlocks(blocks: PatternBlock[], threshold: number): void {
  blocks.forEach((block) => binarize(block.imageData, threshold))
}
