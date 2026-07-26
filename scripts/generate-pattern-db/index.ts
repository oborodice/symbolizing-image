import {
  ASCII,
  HIRAGANA,
  KATAKANA,
  HALFWIDTH_KATAKANA,
  FULLWIDTH_ASCII,
} from './charset.ts'

console.log('ASCII:', ASCII.length)
console.log('Hiragana:', HIRAGANA.length)
console.log('Katakana:', KATAKANA.length)
console.log('Halfwidth Katakana:', HALFWIDTH_KATAKANA.length)
console.log('Fullwidth ASCII:', FULLWIDTH_ASCII.length)
console.log(
  'Total:',
  ASCII.length +
    HIRAGANA.length +
    KATAKANA.length +
    HALFWIDTH_KATAKANA.length +
    FULLWIDTH_ASCII.length,
)

// TODO: 漢字（Unihan kIRG_JSource）・梵字・幽霊文字を追加
// TODO: Noto Sans JP / Noto Sans Siddhamでオフスクリーンcanvasに1文字ずつ描画
// TODO: getImageDataで二値化し、Uint32Arrayにビット詰め
// TODO: バイナリファイルとして書き出す
