import './screen.css'
import { startCamera, CAMERA_WIDTH, CAMERA_HEIGHT } from '../camera'

export function renderDebugScreen(root: HTMLElement): void {
  root.innerHTML = `
    <h1>DEBUG MODE</h1>
    <video id="camera" width="${CAMERA_WIDTH}" height="${CAMERA_HEIGHT}" autoplay playsinline muted></video>
  `

  const video = root.querySelector<HTMLVideoElement>('#camera')!
  startCamera(video)
}
