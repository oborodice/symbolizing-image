import { PATTERN_WORDS, type PatternDb } from './pattern-db'
import { popcount32 } from './popcount'

// packedと最もハミング距離が近いパターンの文字を探す。
// 距離の途中計算がこれまでの最小値以上になった時点で打ち切る(早期終了)ことで、
// 明らかに負けているパターンを最後まで計算せずに済ませている
export function findNearestChar(packed: Uint32Array, db: PatternDb): string {
  const { chars, patterns, entryCount } = db
  let bestIndex = 0
  let bestDistance = Infinity

  for (let entryIndex = 0; entryIndex < entryCount; entryIndex++) {
    const patternOffset = entryIndex * PATTERN_WORDS
    let distance = 0
    for (let wordIndex = 0; wordIndex < PATTERN_WORDS; wordIndex++) {
      distance += popcount32(
        packed[wordIndex] ^ patterns[patternOffset + wordIndex],
      )
      if (distance >= bestDistance) {
        break
      }
    }
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
