import type { BlockRect } from './blocks'

export interface PatternBlock {
  row: number
  col: number
  imageData: ImageData
}

// 各ブロックをcanvasのdrawImageでsize x sizeに直接切り出す。
// 生ピクセルをJS側に読み出してから自前でリサイズするのではなく、
// crop(切り出し範囲の指定)とresizeをブラウザのcanvas合成パイプラインにまとめて任せている
export function extractPatternBlocks(
  source: CanvasImageSource,
  rects: BlockRect[],
  size: number,
): PatternBlock[] {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'

  return rects.map(({ row, col, x, y, width, height }) => {
    ctx.drawImage(source, x, y, width, height, 0, 0, size, size)
    const imageData = ctx.getImageData(0, 0, size, size)
    return { row, col, imageData }
  })
}
