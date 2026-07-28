import type { PatternBlock } from '../pattern/pattern-block'
import type { PatternDb } from '../pattern/pattern-db'
import type { PatternDbMeta } from '../pattern/pattern-db-meta'
import { packBits } from '../pattern/pack-bits'
import { findNearestChar } from '../pattern/match-pattern'
import { fontForChar } from './font-for-char'
import { drawCharCentered } from './draw-char-centered'
import { PATTERN_SIZE } from '../config'

// packedBlockは呼び出し側が使い回す前提(packBits参照)
export function drawMatchedChars(
  ctx: CanvasRenderingContext2D,
  blocks: PatternBlock[],
  patternDb: PatternDb,
  patternDbMeta: PatternDbMeta,
  packedBlock: Uint32Array,
  color: string,
): void {
  ctx.fillStyle = color
  blocks.forEach((block) => {
    packBits(block.imageData, packedBlock)
    const char = findNearestChar(packedBlock, patternDb)
    const { fontFamily, referenceFontSize } = fontForChar(char, patternDbMeta)

    // 基準フォントサイズはPATTERN_SIZE(24px四方)を基準に求めたものなので、
    // ブロックの実際のサイズに合わせて比例でスケールする
    const fontSize = referenceFontSize * (block.height / PATTERN_SIZE)

    drawCharCentered(
      ctx,
      char,
      fontSize,
      fontFamily,
      block.x,
      block.y,
      block.width,
      block.height,
    )
  })
}
