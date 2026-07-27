import meta from '../assets/pattern-db-meta.json'

// pattern-db.bin生成時に一緒に計算された、文字集合ごとの基準フォントサイズ
// (scripts/generate-pattern-db/index.tsのnotoSansJpFontSize/notoSansSiddhamFontSize)。
// 同じ探索アルゴリズムをここで再計算するのではなく、生成側の計算結果をそのまま使う
export interface PatternDbMeta {
  notoSansJpFontSize: number
  notoSansSiddhamFontSize: number
}

export const patternDbMeta: PatternDbMeta = meta
