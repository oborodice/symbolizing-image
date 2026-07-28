// 二値化されたImageDataを、1ピクセル1ビットとしてpackedに詰め直す。黒(0)を1、白(255)を0とする。
//
// 生成側(scripts/generate-pattern-db/pack-bits.ts)のpackBitsは呼ぶたびに新しい配列を
// 返すが、こちらは毎フレーム・ブロックごとに呼ばれるホットパスなので、
// 呼び出し側が使い回すpacked配列に書き込む形にして確保コストを避けている
// 1 word(Uint32) = 32ビット。pixelIndexを「何word目か」「word内の何ビット目か」に変換するのに
// /32・%32と同じ意味だが、ビットシフト/マスクの方が高速なので使っている
const BITS_PER_WORD_SHIFT = 5 // 2^5 = 32
const BITS_PER_WORD_MASK = 31 // 32 - 1

export function packBits(imageData: ImageData, packed: Uint32Array): void {
  packed.fill(0)
  const data = imageData.data
  const pixelCount = imageData.width * imageData.height
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex++) {
    if (data[pixelIndex * 4] === 0) {
      packed[pixelIndex >> BITS_PER_WORD_SHIFT] |=
        1 << (pixelIndex & BITS_PER_WORD_MASK)
    }
  }
}
