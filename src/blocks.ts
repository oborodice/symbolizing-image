export interface BlockRect {
  row: number
  col: number
  x: number
  y: number
  width: number
  height: number
}

// キャンバスをcols x rowsのグリッドに分割し、各マスの矩形範囲を求める。
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
  const rects: BlockRect[] = []

  for (let row = 0; row < rows; row++) {
    const y = Math.floor((row * camHeight) / rows)
    const yEnd = Math.floor(((row + 1) * camHeight) / rows)
    for (let col = 0; col < cols; col++) {
      const x = Math.floor((col * camWidth) / cols)
      const xEnd = Math.floor(((col + 1) * camWidth) / cols)
      rects.push({ row, col, x, y, width: xEnd - x, height: yEnd - y })
    }
  }

  return rects
}
