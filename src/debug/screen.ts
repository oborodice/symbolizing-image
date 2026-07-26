import './screen.css'
import { startCamera } from '../camera'
import { CAMERA_WIDTH, CAMERA_HEIGHT, GRID_COLS, GRID_ROWS, DEFAULT_FPS } from '../config'

const MIN_FPS = 1
const MAX_FPS = 30

function drawGrid(ctx: CanvasRenderingContext2D): void {
  const cellWidth = CAMERA_WIDTH / GRID_COLS
  const cellHeight = CAMERA_HEIGHT / GRID_ROWS

  ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let col = 1; col < GRID_COLS; col++) {
    const x = col * cellWidth
    ctx.moveTo(x, 0)
    ctx.lineTo(x, CAMERA_HEIGHT)
  }
  for (let row = 1; row < GRID_ROWS; row++) {
    const y = row * cellHeight
    ctx.moveTo(0, y)
    ctx.lineTo(CAMERA_WIDTH, y)
  }
  ctx.stroke()
}

export function renderDebugScreen(root: HTMLElement): void {
  root.innerHTML = `
    <h1>DEBUG MODE</h1>
    <video id="camera" width="${CAMERA_WIDTH}" height="${CAMERA_HEIGHT}" autoplay playsinline muted hidden></video>
    <canvas id="preview" width="${CAMERA_WIDTH}" height="${CAMERA_HEIGHT}"></canvas>
    <label>
      FPS: <span id="fps-value">${DEFAULT_FPS}</span>
      <input id="fps-slider" type="range" min="${MIN_FPS}" max="${MAX_FPS}" value="${DEFAULT_FPS}" />
    </label>
    <label>
      <input id="grid-toggle" type="checkbox" />
      Show grid
    </label>
  `

  const video = root.querySelector<HTMLVideoElement>('#camera')!
  const canvas = root.querySelector<HTMLCanvasElement>('#preview')!
  const ctx = canvas.getContext('2d')!
  const fpsSlider = root.querySelector<HTMLInputElement>('#fps-slider')!
  const fpsValue = root.querySelector<HTMLSpanElement>('#fps-value')!
  const gridToggle = root.querySelector<HTMLInputElement>('#grid-toggle')!

  let fps = DEFAULT_FPS
  fpsSlider.addEventListener('input', () => {
    fps = Number(fpsSlider.value)
    fpsValue.textContent = String(fps)
  })

  let showGrid = false
  gridToggle.addEventListener('change', () => {
    showGrid = gridToggle.checked
  })

  startCamera(video)

  let lastDrawTime = 0
  function loop(time: number) {
    const interval = 1000 / fps
    if (time - lastDrawTime >= interval) {
      lastDrawTime = time
      ctx.drawImage(video, 0, 0, CAMERA_WIDTH, CAMERA_HEIGHT)
      if (showGrid) {
        drawGrid(ctx)
      }
    }
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}
