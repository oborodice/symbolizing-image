import { createCanvas, type SKRSContext2D } from '@napi-rs/canvas'
import { renderBinarizedChar } from './binarized-char.ts'
import { findInkBounds } from './ink-bounds.ts'

const MAX_ITERATIONS = 5

// 文字のインク(実際に黒く塗られる領域)の幅・高さのうち大きい方が、sizeに対してどの程度の比率かを求める
function measureInkRatio(
  ctx: SKRSContext2D,
  char: string,
  size: number,
): number {
  const metrics = ctx.measureText(char)
  const inkWidth =
    metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight
  const inkHeight =
    metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
  return Math.max(inkWidth, inkHeight) / size
}

// これが「同じフォントサイズを全文字で使う場合の、事実上のサイズ上限」を決める基準になる
function findLargestChar(
  codePoints: number[],
  fontFamily: string,
  size: number,
): string {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  ctx.font = `${size}px "${fontFamily}"`

  let maxRatio = -Infinity
  let largestChar = ''

  for (const codePoint of codePoints) {
    const char = String.fromCodePoint(codePoint)
    const ratio = measureInkRatio(ctx, char, size)
    if (ratio > maxRatio) {
      maxRatio = ratio
      largestChar = char
    }
  }

  return largestChar
}

// 一番自然に場所を使う文字（findLargestChar）を基準に、
// 二値化後もその文字がキャンバス端まで届く（かつはみ出さない）フォントサイズを収束計算する。
// これを全文字共通で使うことで、他の文字は自然な大きさ（疎密）のまま描かれる
export function findReferenceFontSize(
  codePoints: number[],
  fontFamily: string,
  size: number,
  threshold: number,
): number {
  const largestChar = findLargestChar(codePoints, fontFamily, size)

  let fontSize = size
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const { imageData } = renderBinarizedChar({
      char: largestChar,
      fontSize,
      fontFamily,
      size,
      threshold,
    })
    const bounds = findInkBounds(imageData)
    if (!bounds) break
    const inkWidth = bounds.maxX - bounds.minX + 1
    const inkHeight = bounds.maxY - bounds.minY + 1
    fontSize *= Math.min(size / inkWidth, size / inkHeight)
  }

  return fontSize
}
