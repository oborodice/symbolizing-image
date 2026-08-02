import { writeFileSync } from 'node:fs'

interface PatternEntry {
  codePoint: number
  packed: Uint32Array
}

// レコードのバイトレイアウト。読み込み側(src/pattern/pattern-db.ts)と一致させること
// (全てリトルエンディアン):
// | codePoint (4byte) | word0 (4byte) | word1 (4byte) | ... | word(N-1) (4byte) |
export function writePatternDb(entries: PatternEntry[], outputPath: URL): void {
  const bitsPerWord = 32
  const bytesPerWord = bitsPerWord / 8
  const patternBytes = entries[0].packed.length * bytesPerWord
  const recordSize = bytesPerWord + patternBytes

  const buffer = new ArrayBuffer(entries.length * recordSize)
  const view = new DataView(buffer)

  entries.forEach((entry, i) => {
    const offset = i * recordSize
    view.setUint32(offset, entry.codePoint, true)
    entry.packed.forEach((word, wordIndex) => {
      view.setUint32(offset + bytesPerWord + wordIndex * bytesPerWord, word, true)
    })
  })

  writeFileSync(outputPath, Buffer.from(buffer))
}
