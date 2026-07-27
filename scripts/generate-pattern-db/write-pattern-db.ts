import { writeFileSync } from 'node:fs'

interface PatternEntry {
  codePoint: number
  packed: Uint32Array
}

// 1件につき「4バイトのコードポイント + パターンのビット列」を並べたフラットなバイナリファイルを書き出す
export function writePatternDb(entries: PatternEntry[], outputPath: URL): void {
  const patternBytes = entries[0].packed.length * 4
  const recordSize = 4 + patternBytes

  const buffer = new ArrayBuffer(entries.length * recordSize)
  const view = new DataView(buffer)

  entries.forEach((entry, i) => {
    const offset = i * recordSize
    view.setUint32(offset, entry.codePoint, true)
    entry.packed.forEach((word, wordIndex) => {
      view.setUint32(offset + 4 + wordIndex * 4, word, true)
    })
  })

  writeFileSync(outputPath, Buffer.from(buffer))
}
