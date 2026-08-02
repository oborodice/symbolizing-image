import { PATTERN_WORDS, type PatternDb } from './pattern-db'
import { popcount32 } from './popcount'
import { computeSignature } from './lsh'

function computeQueryPopcount(packed: Uint32Array): number {
  let total = 0
  for (let wordIndex = 0; wordIndex < PATTERN_WORDS; wordIndex++) {
    total += popcount32(packed[wordIndex])
  }
  return total
}

// popcounts(昇順ソート済み)の中で、target以上になる最初のインデックスを二分探索で見つける
function findInsertionIndex(popcounts: Uint32Array, target: number): number {
  let low = 0
  let high = popcounts.length
  while (low < high) {
    const mid = (low + high) >>> 1
    if (popcounts[mid] < target) {
      low = mid + 1
    } else {
      high = mid
    }
  }
  return low
}

function popcountGap(a: number, b: number): number {
  return Math.abs(a - b)
}

// packedとpatterns[patternOffset..]のハミング距離を計算する。ただし距離がbound以上に
// なった時点で打ち切る(早期終了)ため、戻り値がbound以上の場合は「真の距離」ではなく
// 「少なくともbound以上」という意味になる
function hammingDistance(
  packed: Uint32Array,
  patterns: Uint32Array,
  patternOffset: number,
  bound: number,
): number {
  let distance = 0
  for (let wordIndex = 0; wordIndex < PATTERN_WORDS; wordIndex++) {
    distance += popcount32(
      packed[wordIndex] ^ patterns[patternOffset + wordIndex],
    )
    if (distance >= bound) {
      break
    }
  }
  return distance
}

function findNearestChar(
  packed: Uint32Array,
  patternDb: PatternDb,
): string {
  const { chars, patterns, popcounts, entryCount } = patternDb
  const queryPopcount = computeQueryPopcount(packed)

  let bestIndex = 0
  let bestDistance = Infinity

  // |popcount(A) - popcount(B)| <= ハミング距離(A, B) という不等式(厳密な下限)が成り立つため、
  // queryPopcountに近い候補から両方向(two-pointer)に見ていき、popcountの差(軽い比較)だけで
  // bestDistanceを更新できないと分かった候補は、本格比較(hammingDistance)をせず除外する。
  // popcountsはソート済みなので、ある方向で一度差がbestDistance以上になったら、
  // それより先の候補も全て同様に除外できると確定するため、その方向を打ち切ってよい
  //
  // このwhileループは「次に見る候補を決める」「早期終了を判定する」「本格比較する」を
  // あえて1つの関数の中に留めている。この関数は最大1200回/フレーム呼ばれるホットパスで、
  // 「次の候補のindexと更新後のleft/right」をヘルパー関数として切り出そうとすると、
  // JSでは複数の値を配列/オブジェクトなしに返せないため、呼び出しのたびに新規オブジェクトの
  // 生成が発生してしまう。これは他の箇所(pattern-block.tsのPatternBlock使い回し等)で
  // 取り除いてきたホットループでのアロケーションを、ここで新たに持ち込むことになるため見送っている
  let left = findInsertionIndex(popcounts, queryPopcount) - 1
  let right = left + 1

  while (left >= 0 || right < entryCount) {
    const leftGap =
      left >= 0 ? popcountGap(popcounts[left], queryPopcount) : Infinity
    const rightGap =
      right < entryCount
        ? popcountGap(popcounts[right], queryPopcount)
        : Infinity
    const useLeft = leftGap <= rightGap
    const gap = useLeft ? leftGap : rightGap

    if (gap >= bestDistance) {
      if (useLeft) {
        left = -1
      } else {
        right = entryCount
      }
      continue
    }

    const index = useLeft ? left : right
    if (useLeft) {
      left--
    } else {
      right++
    }

    const distance = hammingDistance(
      packed,
      patterns,
      index * PATTERN_WORDS,
      bestDistance,
    )
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
      if (distance === 0) {
        break
      }
    }
  }

  return chars[bestIndex]
}

// 候補の重複排除(seen)と集合(candidates)は、ブロックごとに新規生成せず使い回す
// (最大1200〜2700回/フレーム呼ばれるホットパスでのアロケーションを避けるため)
let seenBuffer: Uint8Array | null = null
let candidateBuffer: Uint32Array | null = null

function getLshBuffers(entryCount: number): {
  seen: Uint8Array
  candidates: Uint32Array
} {
  if (!seenBuffer || seenBuffer.length !== entryCount) {
    seenBuffer = new Uint8Array(entryCount)
    candidateBuffer = new Uint32Array(entryCount)
  }
  return { seen: seenBuffer, candidates: candidateBuffer! }
}

// LSHで絞り込んだ候補だけを本格比較する近似版。候補が1件も見つからなかった場合
// (全表ミス)は、常に正しい結果を返すfindNearestCharにフォールバックする
export function findNearestCharLSH(
  packed: Uint32Array,
  patternDb: PatternDb,
): string {
  const { chars, patterns, entryCount, lsh } = patternDb
  const { seen, candidates } = getLshBuffers(entryCount)
  let candidateCount = 0

  for (let t = 0; t < lsh.positions.length; t++) {
    const signature = computeSignature(packed, lsh.positions[t])
    const offsets = lsh.offsets[t]
    const indices = lsh.indices[t]
    const start = offsets[signature]
    const end = offsets[signature + 1]
    for (let i = start; i < end; i++) {
      const index = indices[i]
      if (!seen[index]) {
        seen[index] = 1
        candidates[candidateCount++] = index
      }
    }
  }

  if (candidateCount === 0) {
    return findNearestChar(packed, patternDb)
  }

  let bestIndex = candidates[0]
  let bestDistance = Infinity
  for (let i = 0; i < candidateCount; i++) {
    const index = candidates[i]
    const distance = hammingDistance(
      packed,
      patterns,
      index * PATTERN_WORDS,
      bestDistance,
    )
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
    // 次回呼び出しのためにmarkを戻す(候補集合の外まで毎回全消去すると
    // entryCount分のコストがかかるため、実際に立てたビットだけ戻す)
    seen[index] = 0
  }

  return chars[bestIndex]
}
