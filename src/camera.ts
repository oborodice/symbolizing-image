// アプリ全体でカメラは同時に1台・1ストリームだけという前提のモジュール単位の状態。
// 複数の<video>を同時に別々のカメラストリームに繋ぎたい場合、後から呼んだ方が
// 先のストリームを止めてしまうため、この前提が崩れたら設計を見直す必要がある
let activeStream: MediaStream | null = null

export async function startCamera(
  video: HTMLVideoElement,
  width: number,
  height: number,
): Promise<void> {
  if (activeStream) {
    activeStream.getTracks().forEach((track) => track.stop())
  }
  activeStream = await navigator.mediaDevices.getUserMedia({
    video: { width, height },
  })
  video.srcObject = activeStream
  // autoplay属性だけでは再生が始まらない環境(Safari、Playwright操作下のChromium等)が
  // あるため、明示的にplay()を呼ぶ
  await video.play()
}
