import patternDbUrl from '../assets/pattern-db.bin?url'
import { PATTERN_SIZE } from '../config'

// レコードのバイトレイアウト。書き込み側(scripts/generate-pattern-db/write-pattern-db.ts)と一致させること
// (全てリトルエンディアン):
// | codePoint (4byte) | word0 (4byte) | word1 (4byte) | ... | word(PATTERN_WORDS-1) (4byte) |
const BITS_PER_WORD = 32
const BYTES_PER_WORD = BITS_PER_WORD / 8

export const PATTERN_WORDS = Math.ceil(
  (PATTERN_SIZE * PATTERN_SIZE) / BITS_PER_WORD,
)
const PATTERN_RECORD_BYTES = BYTES_PER_WORD + PATTERN_WORDS * BYTES_PER_WORD

export interface PatternDb {
  chars: string[]
  patterns: Uint32Array
  entryCount: number
}

function readRecord(
  view: DataView,
  recordOffset: number,
): { char: string; pattern: Uint32Array } {
  const char = String.fromCodePoint(view.getUint32(recordOffset, true))
  const pattern = new Uint32Array(PATTERN_WORDS)
  for (let wordIndex = 0; wordIndex < PATTERN_WORDS; wordIndex++) {
    pattern[wordIndex] = view.getUint32(
      recordOffset + BYTES_PER_WORD + wordIndex * BYTES_PER_WORD,
      true,
    )
  }
  return { char, pattern }
}

function parsePatternDb(buffer: ArrayBuffer): PatternDb {
  const entryCount = buffer.byteLength / PATTERN_RECORD_BYTES
  const chars = new Array<string>(entryCount)
  const patterns = new Uint32Array(entryCount * PATTERN_WORDS)

  const view = new DataView(buffer)
  for (let entryIndex = 0; entryIndex < entryCount; entryIndex++) {
    const { char, pattern } = readRecord(
      view,
      entryIndex * PATTERN_RECORD_BYTES,
    )
    chars[entryIndex] = char
    patterns.set(pattern, entryIndex * PATTERN_WORDS)
  }

  return { chars, patterns, entryCount }
}

export async function loadPatternDb(): Promise<PatternDb> {
  const buffer = await fetch(patternDbUrl).then((response) =>
    response.arrayBuffer(),
  )
  return parsePatternDb(buffer)
}
