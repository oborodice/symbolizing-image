// 8bit分のpopcountを事前計算したテーブル
const POPCOUNT_8 = new Uint8Array(256)
for (let i = 1; i < POPCOUNT_8.length; i++) {
  POPCOUNT_8[i] = POPCOUNT_8[i >> 1] + (i & 1)
}

// 生成側(scripts/generate-pattern-db/pack-bits.ts)はビルド時に1回ずつしか
// 実行されないカーニハン法だが、こちらは毎フレーム大量のパターンと比較する
// ランタイムのホットパスなので、8bitごとのテーブル参照4回で済む方式にしている
export function popcount32(word: number): number {
  return (
    POPCOUNT_8[word & 255] +
    POPCOUNT_8[(word >>> 8) & 255] +
    POPCOUNT_8[(word >>> 16) & 255] +
    POPCOUNT_8[word >>> 24]
  )
}
