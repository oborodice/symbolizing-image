import patternDbUrl from './assets/pattern-db.bin?url'
import { PATTERN_SIZE } from './config'

// パターンDBのレコード形式は、書き込み側(scripts/generate-pattern-db/write-pattern-db.ts)と対応させる:
// 4バイトのコードポイント + パターンのビット列(Uint32 x PATTERN_WORDS、リトルエンディアン)
export const PATTERN_WORDS = Math.ceil((PATTERN_SIZE * PATTERN_SIZE) / 32)
const PATTERN_RECORD_BYTES = 4 + PATTERN_WORDS * 4

export interface PatternDb {
  chars: string[]
  patterns: Uint32Array
  entryCount: number
}

export async function loadPatternDb(): Promise<PatternDb> {
  const buffer = await fetch(patternDbUrl).then((response) =>
    response.arrayBuffer(),
  )
  const view = new DataView(buffer)
  const entryCount = buffer.byteLength / PATTERN_RECORD_BYTES
  const chars = new Array<string>(entryCount)
  const patterns = new Uint32Array(entryCount * PATTERN_WORDS)

  for (let entryIndex = 0; entryIndex < entryCount; entryIndex++) {
    const recordOffset = entryIndex * PATTERN_RECORD_BYTES
    chars[entryIndex] = String.fromCodePoint(
      view.getUint32(recordOffset, true),
    )
    const patternOffset = entryIndex * PATTERN_WORDS
    for (let wordIndex = 0; wordIndex < PATTERN_WORDS; wordIndex++) {
      patterns[patternOffset + wordIndex] = view.getUint32(
        recordOffset + 4 + wordIndex * 4,
        true,
      )
    }
  }

  return { chars, patterns, entryCount }
}
