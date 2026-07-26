export async function startCamera(
  video: HTMLVideoElement,
  width: number,
  height: number,
): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width, height },
  })
  video.srcObject = stream
  return stream
}
