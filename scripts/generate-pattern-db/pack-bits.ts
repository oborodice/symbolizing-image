import type { ImageData } from '@napi-rs/canvas'

// 二値化されたImageDataを、1ピクセル1ビットとしてUint32Arrayに詰め直す。
// 黒(0)を1、白(255)を0とする
export function packBits(imageData: ImageData): Uint32Array {
  const { width, height, data } = imageData
  const pixelCount = width * height
  const packed = new Uint32Array(Math.ceil(pixelCount / 32))

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex++) {
    const isBlack = data[pixelIndex * 4] === 0
    if (isBlack) {
      const wordIndex = Math.floor(pixelIndex / 32)
      const bitIndex = pixelIndex % 32
      packed[wordIndex] |= 1 << bitIndex
    }
  }

  return packed
}

// ブライアン・カーニハンのアルゴリズム: n &= n-1 で最下位の1ビットが1つずつ消えるのを利用する
function kernighanPopcount32(word: number): number {
  let n = word
  let count = 0
  while (n !== 0) {
    n &= n - 1
    count++
  }
  return count
}

// 詰め込んだUint32Array全体の中の、1になっているビットの総数を数える
export function popcount(packed: Uint32Array): number {
  let total = 0
  for (const word of packed) {
    total += kernighanPopcount32(word)
  }
  return total
}
