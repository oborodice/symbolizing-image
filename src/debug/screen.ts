import './screen.css'
import { startCamera } from '../camera'
import {
  CAMERA_WIDTH,
  CAMERA_HEIGHT,
  DEFAULT_GRID_COLS,
  DEFAULT_GRID_ROWS,
  DEFAULT_FPS,
} from '../config'

const MIN_FPS = 1
const MAX_FPS = 30

const MIN_GRID_COLS = 10
const MAX_GRID_COLS = 100

function formatGridLabel(cols: number, rows: number): string {
  const blockWidth = CAMERA_WIDTH / cols
  const blockHeight = CAMERA_HEIGHT / rows
  return `${cols} x ${rows} (${blockWidth.toFixed(1)} x ${blockHeight.toFixed(1)}px)`
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
): void {
  const cellWidth = CAMERA_WIDTH / cols
  const cellHeight = CAMERA_HEIGHT / rows

  ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let col = 1; col < cols; col++) {
    const x = col * cellWidth
    ctx.moveTo(x, 0)
    ctx.lineTo(x, CAMERA_HEIGHT)
  }
  for (let row = 1; row < rows; row++) {
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
    <div class="controls">
      <label>
        FPS: <span id="fps-value">${DEFAULT_FPS}</span>
        <input id="fps-slider" type="range" min="${MIN_FPS}" max="${MAX_FPS}" value="${DEFAULT_FPS}" />
      </label>
      <label>
        <input id="grid-toggle" type="checkbox" />
        Show grid
      </label>
      <label>
        Grid: <span id="grid-value">${formatGridLabel(DEFAULT_GRID_COLS, DEFAULT_GRID_ROWS)}</span>
        <input id="grid-slider" type="range" min="${MIN_GRID_COLS}" max="${MAX_GRID_COLS}" value="${DEFAULT_GRID_COLS}" />
      </label>
    </div>
  `

  const video = root.querySelector<HTMLVideoElement>('#camera')!
  const canvas = root.querySelector<HTMLCanvasElement>('#preview')!
  const ctx = canvas.getContext('2d')!
  const fpsSlider = root.querySelector<HTMLInputElement>('#fps-slider')!
  const fpsValue = root.querySelector<HTMLSpanElement>('#fps-value')!
  const gridToggle = root.querySelector<HTMLInputElement>('#grid-toggle')!
  const gridSlider = root.querySelector<HTMLInputElement>('#grid-slider')!
  const gridValue = root.querySelector<HTMLSpanElement>('#grid-value')!

  let fps = DEFAULT_FPS
  fpsSlider.addEventListener('input', () => {
    fps = Number(fpsSlider.value)
    fpsValue.textContent = String(fps)
  })

  let showGrid = false
  gridToggle.addEventListener('change', () => {
    showGrid = gridToggle.checked
  })

  let gridCols = DEFAULT_GRID_COLS
  let gridRows = DEFAULT_GRID_ROWS
  gridSlider.addEventListener('input', () => {
    gridCols = Number(gridSlider.value)
    gridRows = Math.round((gridCols * CAMERA_HEIGHT) / CAMERA_WIDTH)
    gridValue.textContent = formatGridLabel(gridCols, gridRows)
  })

  startCamera(video)

  let lastDrawTime = 0
  function loop(time: number) {
    const interval = 1000 / fps
    if (time - lastDrawTime >= interval) {
      lastDrawTime = time
      ctx.drawImage(video, 0, 0, CAMERA_WIDTH, CAMERA_HEIGHT)
      if (showGrid) {
        drawGrid(ctx, gridCols, gridRows)
      }
    }
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}
