import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import {
  ASCII,
  HIRAGANA,
  KATAKANA,
  HALFWIDTH_KATAKANA,
  FULLWIDTH_ASCII,
  SIDDHAM,
  KANJI,
} from './charset.ts'
import { drawCharFitted } from './render.ts'
import { exportUpscaledPreview } from './preview.ts'

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

const FONT_FAMILY = 'Noto Sans JP'
GlobalFonts.registerFromPath(
  new URL(
    '../../node_modules/@expo-google-fonts/noto-sans-jp/400Regular/NotoSansJP_400Regular.ttf',
    import.meta.url,
  ).pathname,
  FONT_FAMILY,
)

const bitmapSize = 24
const previewChar = '鬱' // 29画、複雑な漢字での潰れ具合を見る

const bitmapCanvas = createCanvas(bitmapSize, bitmapSize)
const bitmapCtx = bitmapCanvas.getContext('2d')
bitmapCtx.fillStyle = 'white'
bitmapCtx.fillRect(0, 0, bitmapSize, bitmapSize)
bitmapCtx.fillStyle = 'black'

drawCharFitted(bitmapCtx, previewChar, bitmapSize, FONT_FAMILY)
exportUpscaledPreview(
  bitmapCanvas,
  10,
  new URL('./preview.png', import.meta.url),
)

console.log('Preview character:', previewChar)

// TODO: getImageDataで二値化し、Uint32Arrayにビット詰め
// TODO: バイナリファイルとして書き出す
