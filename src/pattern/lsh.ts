// LSH(Locality-Sensitive Hashing)による絞り込み用の表を、ページ読み込み時にその場で構築する。

// ページ読み込みのたびに毎回異なるビット位置が選ばれると、性能計測のたびに無関係な
// ばらつきが入り込み、コード変更前後の比較が正しくできなくなる。そのため常に同じ表に
// なる再現性(同じシードなら常に同じ結果)が必要だが、Math.random()もcrypto.getRandomValues()
// もシード値を指定できず毎回異なる結果になるため、自前で用意する必要がある。
// 線形合同法。統計的な品質は高くないが、ビット位置をそこそこ満遍なく選べれば十分な用途なので問題ない。
// 掛け算にMath.imulを使うのは高速化のためではなく、通常の*だと積が
// Number.MAX_SAFE_INTEGERを超えて浮動小数点の精度が失われるのを避けるため
function createRandom(seed: number): () => number {
  const multiplier = 1103515245
  const increment = 12345
  const modulus = 0x7fffffff
  let state = seed
  return () => {
    state = (Math.imul(state, multiplier) + increment) & modulus
    return state / modulus
  }
}

export interface PatternDbLsh {
  // positions[t]は表tの署名計算に使うkビット位置
  positions: Uint16Array[]
  // offsets[t][s]..offsets[t][s+1]がindices[t]内での、署名sを持つエントリの範囲
  offsets: Uint32Array[]
  indices: Uint32Array[]
}

// フィッシャー–イェーツ法でtotalBits個の位置をシャッフルし、先頭count個を重複なく選ぶ
function pickPositions(
  totalBits: number,
  count: number,
  random: () => number,
): Uint16Array {
  const pool = Array.from({ length: totalBits }, (_, i) => i)
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(random() * (totalBits - i))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return Uint16Array.from(pool.slice(0, count))
}

function extractBit(packed: Uint32Array, position: number): number {
  // /32・%32と同じ意味だが、ビットシフト/マスクの方が高速なので使っている(pack-bits.tsと同じ考え方)
  const bitsPerWordShift = 5 // 2^5 = 32
  const bitsPerWordMask = 31 // 32 - 1
  const wordIndex = position >> bitsPerWordShift
  const bitIndex = position & bitsPerWordMask
  return (packed[wordIndex] >> bitIndex) & 1
}

// 署名(signature): あらかじめランダムに選んだk個のビット位置の値を
// 順番に並べた、kビットの整数。似ているビット列ほど同じ署名になりやすい
// (ランダムな1ビット位置が一致する確率 = 全体の一致ビットの割合、という性質を利用)
export function computeSignature(
  packed: Uint32Array,
  positions: Uint16Array,
): number {
  let signature = 0
  // 他のホットループ(pack-bits.ts等)と同様、イテレータプロトコルのオーバーヘッドを
  // 避けるため添字ループにしている(ブロックごとにL回×このループ、という頻度で呼ばれるため)
  for (let i = 0; i < positions.length; i++) {
    signature = (signature << 1) | extractBit(packed, positions[i])
  }
  return signature
}

// buildTable/buildLshTables共通のパラメータ。buildLshTablesがbuildTableへほぼそのまま
// 引き渡す関係にあるため、片方だけ直して型がズレることのないよう1箇所にまとめている
interface BuildTablesParams {
  patterns: Uint32Array
  entryCount: number
  patternWords: number
  totalBits: number
}

// カウンティングソートで、各エントリの署名をバケット(signature値)ごとにまとめ、
// CSR形式(offsets+indices)で保持する。Map等の辞書を使わず連続したUint32Arrayだけで
// 表現することで、ランタイム側の検索をポインタを辿らない単純な添字操作だけで済ませられる
function buildTable(
  options: BuildTablesParams & { random: () => number },
): { positions: Uint16Array; offsets: Uint32Array; indices: Uint32Array } {
  const { patterns, entryCount, patternWords, totalBits, random } = options
  const signatureBits = 10
  const positions = pickPositions(totalBits, signatureBits, random)
  const bucketCount = 1 << signatureBits

  const signatures = new Uint32Array(entryCount)
  const counts = new Uint32Array(bucketCount)
  for (let i = 0; i < entryCount; i++) {
    const entry = patterns.subarray(
      i * patternWords,
      (i + 1) * patternWords,
    )
    const signature = computeSignature(entry, positions)
    signatures[i] = signature
    counts[signature]++
  }

  const offsets = new Uint32Array(bucketCount + 1)
  for (let bucket = 0; bucket < bucketCount; bucket++) {
    offsets[bucket + 1] = offsets[bucket] + counts[bucket]
  }

  const cursor = offsets.slice(0, bucketCount)
  const indices = new Uint32Array(entryCount)
  for (let i = 0; i < entryCount; i++) {
    const signature = signatures[i]
    indices[cursor[signature]++] = i
  }

  return { positions, offsets, indices }
}

// 独立な表をL個用意し、検索時はどれか1つでも署名が一致すれば
// 候補として拾うことで、1つの表だけでは見逃しやすい欠点を補う
export function buildLshTables(options: BuildTablesParams): PatternDbLsh {
  const { patterns, entryCount, patternWords, totalBits } = options
  const randomSeed = 0x9e3779b9
  // createRandomをループの中で毎回呼び直すと、L個の表全部が同じシードから
  // 始まってしまい、全て同じビット位置になる(独立な表という前提が崩れる)。
  // 1つの乱数列をL回分、連続して消費させる必要があるため、ループの外で1回だけ生成する
  const random = createRandom(randomSeed)
  const tableCount = 8
  const positions: Uint16Array[] = []
  const offsets: Uint32Array[] = []
  const indices: Uint32Array[] = []

  for (let t = 0; t < tableCount; t++) {
    const table = buildTable({ patterns, entryCount, patternWords, totalBits, random })
    positions.push(table.positions)
    offsets.push(table.offsets)
    indices.push(table.indices)
  }

  return { positions, offsets, indices }
}
