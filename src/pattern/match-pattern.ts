import { PATTERN_WORDS, type PatternDb } from './pattern-db'
import { popcount32 } from './popcount'

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

export function findNearestChar(
  packed: Uint32Array,
  patternDb: PatternDb,
): string {
  const { chars, patterns, entryCount } = patternDb
  let bestIndex = 0
  let bestDistance = Infinity

  for (let entryIndex = 0; entryIndex < entryCount; entryIndex++) {
    const distance = hammingDistance(
      packed,
      patterns,
      entryIndex * PATTERN_WORDS,
      bestDistance,
    )
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = entryIndex
      if (distance === 0) {
        break
      }
    }
  }

  return chars[bestIndex]
}
