import type { ImageData } from '@napi-rs/canvas'

interface InkBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

// 二値化後の画像から、実際に黒(0)になっているピクセルの範囲を探す
export function findInkBounds(imageData: ImageData): InkBounds | null {
  const { width, height, data } = imageData
  let minX = width
  let maxX = -1
  let minY = height
  let maxY = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if (data[i] === 0) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  return maxX < 0 ? null : { minX, maxX, minY, maxY }
}
