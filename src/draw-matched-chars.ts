import type { PatternBlock } from './pattern-block'
import type { PatternDb } from './pattern-db'
import { packBits } from './pack-bits'
import { findNearestChar } from './match-pattern'

// 各ブロックについて最も近い文字を探し、そのブロックの位置に描画する。
// packedBlockは呼び出し側が使い回す前提(packBits参照)
export function drawMatchedChars(
  ctx: CanvasRenderingContext2D,
  blocks: PatternBlock[],
  db: PatternDb,
  packedBlock: Uint32Array,
): void {
  ctx.fillStyle = 'rgb(0, 255, 0)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  blocks.forEach((block) => {
    packBits(block.imageData, packedBlock)
    ctx.font = `${Math.max(8, Math.floor(block.height * 0.8))}px sans-serif`
    ctx.fillText(
      findNearestChar(packedBlock, db),
      block.x + block.width / 2,
      block.y + block.height / 2,
    )
  })
}
