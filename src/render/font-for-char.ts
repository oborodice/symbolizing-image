import { NOTO_SANS_JP, NOTO_SANS_SIDDHAM } from './fonts'
import type { PatternDbMeta } from '../pattern/pattern-db-meta'

// Siddhamブロックの範囲（scripts/generate-pattern-db/charset.tsのSIDDHAMと対応）
const SIDDHAM_START = 0x11580
const SIDDHAM_END = 0x115dd

export interface FontForChar {
  fontFamily: string
  referenceFontSize: number
}

// 選ばれた文字のコードポイントから、描画に使うフォントと、そのフォントの
// 基準フォントサイズ（生成側で計算済みのもの）を判定する
export function fontForChar(char: string, meta: PatternDbMeta): FontForChar {
  const codePoint = char.codePointAt(0)!
  if (codePoint >= SIDDHAM_START && codePoint <= SIDDHAM_END) {
    return {
      fontFamily: NOTO_SANS_SIDDHAM,
      referenceFontSize: meta.notoSansSiddhamFontSize,
    }
  }
  return {
    fontFamily: NOTO_SANS_JP,
    referenceFontSize: meta.notoSansJpFontSize,
  }
}
