// canvas全体をCSSで反転すると、後で描く文字まで鏡文字になってしまうため、
// この映像描画だけを反転させ、文字の描画には影響させない
export function drawMirroredCamera(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  camWidth: number,
  camHeight: number,
): void {
  ctx.save()
  ctx.scale(-1, 1)
  ctx.drawImage(video, -camWidth, 0, camWidth, camHeight)
  ctx.restore()
}
