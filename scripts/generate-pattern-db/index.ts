import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
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

console.log('ASCII:', ASCII.length)
console.log('Hiragana:', HIRAGANA.length)
console.log('Katakana:', KATAKANA.length)
console.log('Halfwidth Katakana:', HALFWIDTH_KATAKANA.length)
console.log('Fullwidth ASCII:', FULLWIDTH_ASCII.length)
console.log('Siddham:', SIDDHAM.length)
console.log('Kanji:', KANJI.length)
console.log(
  'Total:',
  ASCII.length +
    HIRAGANA.length +
    KATAKANA.length +
    HALFWIDTH_KATAKANA.length +
    FULLWIDTH_ASCII.length +
    SIDDHAM.length +
    KANJI.length,
)

GlobalFonts.registerFromPath(
  new URL(
    '../../node_modules/@expo-google-fonts/noto-sans-jp/400Regular/NotoSansJP_400Regular.ttf',
    import.meta.url,
  ).pathname,
  'Noto Sans JP',
)

const previewSize = 200
const canvas = createCanvas(previewSize, previewSize)
const ctx = canvas.getContext('2d')

ctx.fillStyle = 'white'
ctx.fillRect(0, 0, previewSize, previewSize)

ctx.fillStyle = 'black'
ctx.font = `${previewSize * 0.8}px "Noto Sans JP"`
ctx.textAlign = 'center'
ctx.textBaseline = 'middle'
ctx.fillText(String.fromCodePoint(KANJI[0]), previewSize / 2, previewSize / 2)

writeFileSync(
  new URL('./preview.png', import.meta.url),
  canvas.toBuffer('image/png'),
)

console.log('Preview character:', String.fromCodePoint(KANJI[0]))

// TODO: getImageDataで二値化し、Uint32Arrayにビット詰め
// TODO: バイナリファイルとして書き出す
