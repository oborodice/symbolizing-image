import { CAMERA_WIDTH, CAMERA_HEIGHT } from './config'

export async function startCamera(video: HTMLVideoElement): Promise<void> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: CAMERA_WIDTH, height: CAMERA_HEIGHT },
  })
  video.srcObject = stream
}
