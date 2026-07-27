import type { ImageData } from '@napi-rs/canvas'

// src/binarize.tsと同じロジック（実行環境が分かれているため複製。
// ライブカメラ映像側と同じ閾値ルールで揃える必要がある）
export function binarize(imageData: ImageData, threshold: number): void {
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    // ITU-R BT.601の輝度係数。人間の目は緑に最も敏感で青に最も鈍いため、単純平均ではなく重み付けする
    const luminance =
      0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    const value = luminance >= threshold ? 255 : 0
    data[i] = value
    data[i + 1] = value
    data[i + 2] = value
  }
}
