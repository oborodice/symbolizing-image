import type { BlockRect } from './blocks'
import type { PatternBlock } from './pattern-block'
import type { PatternDb } from './pattern-db'
import { packBits } from './pack-bits'
import { findNearestChar } from './match-pattern'

// 各ブロックについて最も近い文字を探し、そのブロックの位置に描画する。
// packedBlockは呼び出し側が使い回す前提(packBits参照)
export function drawMatchedChars(
  ctx: CanvasRenderingContext2D,
  blocks: PatternBlock[],
  rects: BlockRect[],
  db: PatternDb,
  packedBlock: Uint32Array,
): void {
  ctx.fillStyle = 'rgb(0, 255, 0)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  blocks.forEach((block, i) => {
    const rect = rects[i]
    packBits(block.imageData, packedBlock)
    ctx.font = `${Math.max(8, Math.floor(rect.height * 0.8))}px sans-serif`
    ctx.fillText(
      findNearestChar(packedBlock, db),
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
    )
  })
}
