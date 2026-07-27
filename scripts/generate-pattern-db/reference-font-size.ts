import { createCanvas } from '@napi-rs/canvas'
import { renderBinarizedChar } from './binarized-char.ts'
import { findInkBounds } from './ink-bounds.ts'

const MAX_ITERATIONS = 5

// 文字集合の中で、指定サイズで測ったときに自然なインクの範囲が一番大きい文字を探す。
// これが「同じフォントサイズを全文字で使う場合の、事実上のサイズ上限」を決める基準になる
function findWidestChar(
  codePoints: number[],
  fontFamily: string,
  size: number,
): string {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  ctx.font = `${size}px "${fontFamily}"`

  let maxRatio = -Infinity
  let widestChar = ''

  for (const codePoint of codePoints) {
    const char = String.fromCodePoint(codePoint)
    const metrics = ctx.measureText(char)
    const width = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight
    const height =
      metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
    const ratio = Math.max(width, height) / size
    if (ratio > maxRatio) {
      maxRatio = ratio
      widestChar = char
    }
  }

  return widestChar
}

// 文字集合全体で共通して使うフォントサイズを求める。
// 一番自然に場所を使う文字（findWidestChar）を基準に、
// 二値化後もその文字がキャンバス端まで届く（かつはみ出さない）フォントサイズを収束計算する。
// これを全文字共通で使うことで、他の文字は自然な大きさ（疎密）のまま描かれる
export function findReferenceFontSize(
  codePoints: number[],
  fontFamily: string,
  size: number,
  threshold: number,
): number {
  const widestChar = findWidestChar(codePoints, fontFamily, size)

  let fontSize = size
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const { imageData } = renderBinarizedChar({
      char: widestChar,
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
