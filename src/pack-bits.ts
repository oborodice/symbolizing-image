// 二値化されたImageDataを、1ピクセル1ビットとしてpackedに詰め直す。黒(0)を1、白(255)を0とする。
//
// 生成側(scripts/generate-pattern-db/pack-bits.ts)のpackBitsは呼ぶたびに新しい配列を
// 返すが、こちらは毎フレーム・ブロックごとに呼ばれるホットパスなので、
// 呼び出し側が使い回すpacked配列に書き込む形にして確保コストを避けている
export function packBits(imageData: ImageData, packed: Uint32Array): void {
  packed.fill(0)
  const data = imageData.data
  const pixelCount = imageData.width * imageData.height
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex++) {
    if (data[pixelIndex * 4] === 0) {
      packed[pixelIndex >> 5] |= 1 << (pixelIndex & 31)
    }
  }
}
