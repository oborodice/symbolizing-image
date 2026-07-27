import { type Canvas, createCanvas } from '@napi-rs/canvas'
import { writeFileSync } from 'node:fs'

// ビットマップ解像度の生ピクセルは小さすぎて見えないので、拡大してファイルに書き出す
export function exportUpscaledPreview(
  source: Canvas,
  scale: number,
  outputPath: URL,
): void {
  const width = source.width * scale
  const height = source.height * scale

  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(source, 0, 0, width, height)

  writeFileSync(outputPath, canvas.toBuffer('image/png'))
}
