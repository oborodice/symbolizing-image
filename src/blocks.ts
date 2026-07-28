export interface BlockRect {
  row: number
  col: number
  x: number
  y: number
  width: number
  height: number
}

// 位置(row/col)を各要素自身に持たせているのは、後続処理で間引き・並べ替え・
// chunk分割などをしても、配列のインデックスに頼らず位置が分かるようにするため
//
// camWidth/camHeightがcols/rowsで割り切れるとは限らないため、
// 各マスの境界はMath.floorで丸めた上で「次の境界との差」を幅・高さとすることで、
// マス同士の隙間や重なりが出ないようにしている
export function computeBlockRects(
  camWidth: number,
  camHeight: number,
  cols: number,
  rows: number,
): BlockRect[] {
  // 列の境界はrowに依存しないため、行のループに入る前に1度だけ計算しておく
  const colBounds = Array.from({ length: cols + 1 }, (_, col) =>
    Math.floor((col * camWidth) / cols),
  )

  const rects: BlockRect[] = []

  for (let row = 0; row < rows; row++) {
    const y = Math.floor((row * camHeight) / rows)
    const yEnd = Math.floor(((row + 1) * camHeight) / rows)
    for (let col = 0; col < cols; col++) {
      const x = colBounds[col]
      const xEnd = colBounds[col + 1]
      rects.push({ row, col, x, y, width: xEnd - x, height: yEnd - y })
    }
  }

  return rects
}
