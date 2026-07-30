import { NOTO_SANS_JP, NOTO_SANS_SIDDHAM } from './fonts'
import type { PatternDbMeta } from '../pattern/pattern-db-meta'

// Siddhamブロックの範囲（scripts/generate-pattern-db/charset.tsのSIDDHAMと対応）
const SIDDHAM_START = 0x11580
const SIDDHAM_END = 0x115dd

export interface FontForChar {
  fontFamily: string
  referenceFontSize: number
}

// 結果は「Siddham用」「Noto Sans JP用」の2パターンしかなく、patternDbMetaも
// 起動時に読み込まれたきり変わらないため、毎回新規生成せず初回だけ組み立てて使い回す
let siddhamResult: FontForChar | undefined
let jpResult: FontForChar | undefined

export function fontForChar(
  char: string,
  patternDbMeta: PatternDbMeta,
): FontForChar {
  if (!siddhamResult) {
    siddhamResult = {
      fontFamily: NOTO_SANS_SIDDHAM,
      referenceFontSize: patternDbMeta.notoSansSiddhamFontSize,
    }
    jpResult = {
      fontFamily: NOTO_SANS_JP,
      referenceFontSize: patternDbMeta.notoSansJpFontSize,
    }
  }

  const codePoint = char.codePointAt(0)!
  if (codePoint >= SIDDHAM_START && codePoint <= SIDDHAM_END) {
    return siddhamResult
  }
  return jpResult!
}
