import type { BlockRect } from './blocks'

export interface PatternBlock extends BlockRect {
  imageData: ImageData
}

// 切り出し用のcanvasは毎フレーム作り直すと無駄なので使い回す。
// sizeが変わった場合のみ作り直す（現状は常に同じPATTERN_SIZEだが、念のため）
let cropCtx: CanvasRenderingContext2D | null = null

function getCropContext(size: number): CanvasRenderingContext2D {
  if (!cropCtx || cropCtx.canvas.width !== size || cropCtx.canvas.height !== size) {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    cropCtx = canvas.getContext('2d')!
    cropCtx.imageSmoothingQuality = 'high'
  }
  return cropCtx
}

// 各ブロックをcanvasのdrawImageでsize x sizeに直接切り出す。
// 生ピクセルをJS側に読み出してから自前でリサイズするのではなく、
// crop(切り出し範囲の指定)とresizeをブラウザのcanvas合成パイプラインにまとめて任せている
export function extractPatternBlocks(
  source: CanvasImageSource,
  rects: BlockRect[],
  size: number,
): PatternBlock[] {
  const ctx = getCropContext(size)

  return rects.map((rect) => {
    const { x, y, width, height } = rect
    ctx.drawImage(source, x, y, width, height, 0, 0, size, size)
    const imageData = ctx.getImageData(0, 0, size, size)
    return { ...rect, imageData }
  })
}
