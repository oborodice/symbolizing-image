// ITU-R BT.601の輝度係数。人間の目は緑に最も敏感で青に最も鈍いため、単純平均ではなく重み付けする
function computeLuminance(data: Uint8ClampedArray, i: number): number {
  const r = data[i]
  const g = data[i + 1]
  const b = data[i + 2]
  return 0.299 * r + 0.587 * g + 0.114 * b
}

export function binarize(imageData: ImageData, threshold: number): void {
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const value = computeLuminance(data, i) >= threshold ? 255 : 0
    data[i] = value
    data[i + 1] = value
    data[i + 2] = value
  }
}

// フレーム全体の平均輝度をthresholdとして使う。照明条件の変化(展示中の明るさ変化等)に
// 自動で追従させるための実装
export function computeMeanLuminanceThreshold(
  blocks: readonly { imageData: ImageData }[],
): number {
  let count = 0
  let sum = 0
  for (let i = 0; i < blocks.length; i++) {
    const data = blocks[i].imageData.data
    for (let j = 0; j < data.length; j += 4) {
      count++
      sum += computeLuminance(data, j)
    }
  }
  return sum / count
}
