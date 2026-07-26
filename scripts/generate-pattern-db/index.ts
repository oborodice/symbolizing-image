import {
  ASCII,
  HIRAGANA,
  KATAKANA,
  HALFWIDTH_KATAKANA,
  FULLWIDTH_ASCII,
  SIDDHAM,
} from './charset.ts'

console.log('ASCII:', ASCII.length)
console.log('Hiragana:', HIRAGANA.length)
console.log('Katakana:', KATAKANA.length)
console.log('Halfwidth Katakana:', HALFWIDTH_KATAKANA.length)
console.log('Fullwidth ASCII:', FULLWIDTH_ASCII.length)
console.log('Siddham:', SIDDHAM.length)
console.log(
  'Total:',
  ASCII.length +
    HIRAGANA.length +
    KATAKANA.length +
    HALFWIDTH_KATAKANA.length +
    FULLWIDTH_ASCII.length +
    SIDDHAM.length,
)

// TODO: 漢字（Unihan kIRG_JSource）を追加
// TODO: Noto Sans JP / Noto Sans Siddhamでオフスクリーンcanvasに1文字ずつ描画
// TODO: getImageDataで二値化し、Uint32Arrayにビット詰め
// TODO: バイナリファイルとして書き出す
