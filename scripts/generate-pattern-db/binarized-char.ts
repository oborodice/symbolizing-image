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
