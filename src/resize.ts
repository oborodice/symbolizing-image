// 面積按分（area-weighted average）でImageDataをtargetSize x targetSizeにリサイズする。
// 「出力側の1ピクセルに、入力側のどの範囲がどれだけ重なるか」を面積で重み付けして平均するため、
// 縮小（入力側の複数ピクセルが1つに混ざる）でも拡大（1つの入力ピクセルが複数に伸びる）でも
// 同じ計算式で扱える。
//
// ここではまだ二値化はしない。二値化は情報を捨てる不可逆な処理なので、
// リサイズ（平均）で情報をできるだけ保ったまま合成した後、最後に一度だけ行う
export function resizeImageData(
  source: ImageData,
  targetSize: number,
): ImageData {
  const { width: srcWidth, height: srcHeight, data: srcData } = source
  const target = new ImageData(targetSize, targetSize)
  const dstData = target.data

  const scaleX = srcWidth / targetSize
  const scaleY = srcHeight / targetSize

  for (let ty = 0; ty < targetSize; ty++) {
    const srcYStart = ty * scaleY
    const srcYEnd = Math.min((ty + 1) * scaleY, srcHeight)

    for (let tx = 0; tx < targetSize; tx++) {
      const srcXStart = tx * scaleX
      const srcXEnd = Math.min((tx + 1) * scaleX, srcWidth)

      let r = 0
      let g = 0
      let b = 0
      let a = 0
      let weightSum = 0

      for (let sy = Math.floor(srcYStart); sy < srcYEnd; sy++) {
        const overlapY = Math.min(sy + 1, srcYEnd) - Math.max(sy, srcYStart)
        for (let sx = Math.floor(srcXStart); sx < srcXEnd; sx++) {
          const overlapX = Math.min(sx + 1, srcXEnd) - Math.max(sx, srcXStart)
          const weight = overlapX * overlapY
          const i = (sy * srcWidth + sx) * 4
          r += srcData[i] * weight
          g += srcData[i + 1] * weight
          b += srcData[i + 2] * weight
          a += srcData[i + 3] * weight
          weightSum += weight
        }
      }

      const di = (ty * targetSize + tx) * 4
      dstData[di] = r / weightSum
      dstData[di + 1] = g / weightSum
      dstData[di + 2] = b / weightSum
      dstData[di + 3] = a / weightSum
    }
  }

  return target
}
