import './screen.css'
import { startCamera, CAMERA_WIDTH, CAMERA_HEIGHT } from '../camera'

const DEFAULT_FPS = 15
const MIN_FPS = 1
const MAX_FPS = 30

export function renderDebugScreen(root: HTMLElement): void {
  root.innerHTML = `
    <h1>DEBUG MODE</h1>
    <video id="camera" width="${CAMERA_WIDTH}" height="${CAMERA_HEIGHT}" autoplay playsinline muted hidden></video>
    <canvas id="preview" width="${CAMERA_WIDTH}" height="${CAMERA_HEIGHT}"></canvas>
    <label>
      FPS: <span id="fps-value">${DEFAULT_FPS}</span>
      <input id="fps-slider" type="range" min="${MIN_FPS}" max="${MAX_FPS}" value="${DEFAULT_FPS}" />
    </label>
  `

  const video = root.querySelector<HTMLVideoElement>('#camera')!
  const canvas = root.querySelector<HTMLCanvasElement>('#preview')!
  const ctx = canvas.getContext('2d')!
  const fpsSlider = root.querySelector<HTMLInputElement>('#fps-slider')!
  const fpsValue = root.querySelector<HTMLSpanElement>('#fps-value')!

  let fps = DEFAULT_FPS
  fpsSlider.addEventListener('input', () => {
    fps = Number(fpsSlider.value)
    fpsValue.textContent = String(fps)
  })

  startCamera(video)

  let lastDrawTime = 0
  function loop(time: number) {
    const interval = 1000 / fps
    if (time - lastDrawTime >= interval) {
      lastDrawTime = time
      ctx.drawImage(video, 0, 0, CAMERA_WIDTH, CAMERA_HEIGHT)
    }
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}
