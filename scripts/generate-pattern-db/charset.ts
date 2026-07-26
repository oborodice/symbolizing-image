function range(start: number, end: number): number[] {
  const codePoints: number[] = []
  for (let cp = start; cp <= end; cp++) {
    codePoints.push(cp)
  }
  return codePoints
}

export const ASCII = range(0x0020, 0x007e)

// U+3040, U+3097, U+3098は未割当のため除外
export const HIRAGANA = [...range(0x3041, 0x3096), ...range(0x3099, 0x309f)]

export const KATAKANA = range(0x30a0, 0x30ff)

export const HALFWIDTH_KATAKANA = range(0xff61, 0xff9f)

export const FULLWIDTH_ASCII = range(0xff01, 0xff5e)

// U+115B6, U+115B7は未割当のため除外
export const SIDDHAM = [...range(0x11580, 0x115b5), ...range(0x115b8, 0x115dd)]
