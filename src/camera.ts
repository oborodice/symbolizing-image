export const CAMERA_WIDTH = 640
export const CAMERA_HEIGHT = 480

export async function startCamera(video: HTMLVideoElement): Promise<void> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: CAMERA_WIDTH, height: CAMERA_HEIGHT },
  })
  video.srcObject = stream
}
