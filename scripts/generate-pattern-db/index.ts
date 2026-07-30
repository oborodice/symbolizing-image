import { GlobalFonts } from '@napi-rs/canvas'
import { writeFileSync } from 'node:fs'
import {
  ASCII,
  HIRAGANA,
  KATAKANA,
  HALFWIDTH_KATAKANA,
  FULLWIDTH_ASCII,
  SIDDHAM,
  KANJI,
} from './charset.ts'
import { renderBinarizedChar } from './binarized-char.ts'
import { findReferenceFontSize } from './reference-font-size.ts'
import { packBits } from './pack-bits.ts'
import { writePatternDb } from './write-pattern-db.ts'

const charsets = {
  ASCII,
  Hiragana: HIRAGANA,
  Katakana: KATAKANA,
  'Halfwidth Katakana': HALFWIDTH_KATAKANA,
  'Fullwidth ASCII': FULLWIDTH_ASCII,
  Siddham: SIDDHAM,
  Kanji: KANJI,
}

let total = 0
for (const [name, codePoints] of Object.entries(charsets)) {
  console.log(`${name}:`, codePoints.length)
  total += codePoints.length
}
console.log('Total:', total)

function registerFont(name: string, relativePath: string): void {
  GlobalFonts.registerFromPath(
    new URL(relativePath, import.meta.url).pathname,
    name,
  )
}

const NOTO_SANS_JP = 'Noto Sans JP'
registerFont(
  NOTO_SANS_JP,
  '../../node_modules/@expo-google-fonts/noto-sans-jp/400Regular/NotoSansJP_400Regular.ttf',
)

const NOTO_SANS_SIDDHAM = 'Noto Sans Siddham'
registerFont(
  NOTO_SANS_SIDDHAM,
  '../../node_modules/@expo-google-fonts/noto-sans-siddham/400Regular/NotoSansSiddham_400Regular.ttf',
)

const PATTERN_SIZE = 24
// ライブカメラ映像側（src/config.tsのBINARIZE_THRESHOLD）と同じ閾値に揃える
const BINARIZE_THRESHOLD = 128

// Noto Sans JPで描く文字集合全体の基準フォントサイズは、漢字だけを対象に探索する。
// 「|」等の記号は罫線的な用途で意図的に縦長にデザインされており、
// 情報量の多さとは無関係にキャンバスをはみ出す（探索の基準として不適切）ため対象外
const notoSansJpFontSize = findReferenceFontSize(
  KANJI,
  NOTO_SANS_JP,
  PATTERN_SIZE,
  BINARIZE_THRESHOLD,
)
console.log('Noto Sans JP font size:', notoSansJpFontSize)

// Noto Sans Siddhamは別フォントなので、梵字だけで別途基準フォントサイズを求める
const notoSansSiddhamFontSize = findReferenceFontSize(
  SIDDHAM,
  NOTO_SANS_SIDDHAM,
  PATTERN_SIZE,
  BINARIZE_THRESHOLD,
)
console.log('Noto Sans Siddham font size:', notoSansSiddhamFontSize)

// ライブカメラ側（表示時に文字を描き直す処理）が、同じ「基準フォントサイズ」を
// 再計算せずに済むよう、算出結果をpattern-db.binとは別の小さなメタデータとして書き出す
const patternDbMetaPath = new URL(
  '../../src/assets/pattern-db-meta.json',
  import.meta.url,
)
writeFileSync(
  patternDbMetaPath,
  JSON.stringify({ notoSansJpFontSize, notoSansSiddhamFontSize }),
)
console.log('Wrote pattern DB meta:', patternDbMetaPath.pathname)

function buildEntries(
  codePoints: number[],
  fontFamily: string,
  fontSize: number,
): { codePoint: number; packed: Uint32Array }[] {
  return codePoints.map((codePoint) => {
    const { imageData } = renderBinarizedChar({
      char: String.fromCodePoint(codePoint),
      fontSize,
      fontFamily,
      size: PATTERN_SIZE,
      threshold: BINARIZE_THRESHOLD,
    })
    return { codePoint, packed: packBits(imageData) }
  })
}

const notoSansJpCodePoints = [
  ...ASCII,
  ...HIRAGANA,
  ...KATAKANA,
  ...HALFWIDTH_KATAKANA,
  ...FULLWIDTH_ASCII,
  ...KANJI,
]

const allEntries = [
  ...buildEntries(notoSansJpCodePoints, NOTO_SANS_JP, notoSansJpFontSize),
  ...buildEntries(SIDDHAM, NOTO_SANS_SIDDHAM, notoSansSiddhamFontSize),
]
console.log('Entries:', allEntries.length)

const patternDbPath = new URL(
  '../../src/assets/pattern-db.bin',
  import.meta.url,
)
writePatternDb(allEntries, patternDbPath)
console.log('Wrote pattern DB:', patternDbPath.pathname)
