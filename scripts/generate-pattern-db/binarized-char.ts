import { type Canvas, type ImageData, createCanvas } from '@napi-rs/canvas'
import { binarize } from './binarize.ts'
import { drawCharCentered } from './center-char.ts'

export interface RenderOptions {
  char: string
  fontSize: number
  fontFamily: string
  size: number
  threshold: number
}

// 指定サイズの白背景canvasに文字を中央揃えで描き、二値化する
export function renderBinarizedChar(
  options: RenderOptions,
): { canvas: Canvas; imageData: ImageData } {
  const { char, fontSize, fontFamily, size, threshold } = options

  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = 'black'

  drawCharCentered(ctx, char, fontSize, fontFamily, size)

  const imageData = ctx.getImageData(0, 0, size, size)
  binarize(imageData, threshold)

  return { canvas, imageData }
}

// 二値化した結果をcanvas自身にも書き戻して返す（見た目としてそのまま使える形）
export function renderBitmap(options: RenderOptions): Canvas {
  const { canvas, imageData } = renderBinarizedChar(options)
  canvas.getContext('2d').putImageData(imageData, 0, 0)
  return canvas
}
