import './screen.css'
import { startCamera } from '../camera'
import { binarize } from '../binarize'
import {
  CAMERA_WIDTH,
  CAMERA_HEIGHT,
  DEFAULT_GRID_COLS,
  DEFAULT_GRID_ROWS,
  DEFAULT_FPS,
  BINARIZE_THRESHOLD,
} from '../config'

const MIN_FPS = 1
const MAX_FPS = 30

const MIN_GRID_COLS = 10
const MAX_GRID_COLS = 100

const MIN_THRESHOLD = 0
const MAX_THRESHOLD = 255

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
        <input id="binarize-toggle" type="checkbox" />
        Binarize
      </label>
      <label>
        Threshold: <span id="threshold-value">${BINARIZE_THRESHOLD}</span>
        <input id="threshold-slider" type="range" min="${MIN_THRESHOLD}" max="${MAX_THRESHOLD}" value="${BINARIZE_THRESHOLD}" />
      </label>
      <label>
        <input id="grid-toggle" type="checkbox" />
        Show grid
      </label>
      <label>
        Grid: <span id="grid-value">${formatGridLabel(DEFAULT_GRID_COLS, DEFAULT_GRID_ROWS)}</span>
        <input id="grid-slider" type="range" min="${MIN_GRID_COLS}" max="${MAX_GRID_COLS}" value="${DEFAULT_GRID_COLS}" />
      </label>
      <button id="reset-button" type="button">Reset parameters</button>
    </div>
  `

  const video = root.querySelector<HTMLVideoElement>('#camera')!
  const canvas = root.querySelector<HTMLCanvasElement>('#preview')!
  const ctx = canvas.getContext('2d')!
  const fpsSlider = root.querySelector<HTMLInputElement>('#fps-slider')!
  const fpsValue = root.querySelector<HTMLSpanElement>('#fps-value')!
  const binarizeToggle =
    root.querySelector<HTMLInputElement>('#binarize-toggle')!
  const thresholdSlider =
    root.querySelector<HTMLInputElement>('#threshold-slider')!
  const thresholdValue =
    root.querySelector<HTMLSpanElement>('#threshold-value')!
  const gridToggle = root.querySelector<HTMLInputElement>('#grid-toggle')!
  const gridSlider = root.querySelector<HTMLInputElement>('#grid-slider')!
  const gridValue = root.querySelector<HTMLSpanElement>('#grid-value')!
  const resetButton = root.querySelector<HTMLButtonElement>('#reset-button')!

  let fps = DEFAULT_FPS
  function setFps(value: number): void {
    fps = value
    fpsSlider.value = String(value)
    fpsValue.textContent = String(value)
  }
  fpsSlider.addEventListener('input', () => setFps(Number(fpsSlider.value)))

  const DEFAULT_BINARIZE = false
  let binarizeEnabled = DEFAULT_BINARIZE
  function setBinarize(value: boolean): void {
    binarizeEnabled = value
    binarizeToggle.checked = value
  }
  binarizeToggle.addEventListener('change', () =>
    setBinarize(binarizeToggle.checked),
  )

  let threshold = BINARIZE_THRESHOLD
  function setThreshold(value: number): void {
    threshold = value
    thresholdSlider.value = String(value)
    thresholdValue.textContent = String(value)
  }
  thresholdSlider.addEventListener('input', () =>
    setThreshold(Number(thresholdSlider.value)),
  )

  const DEFAULT_SHOW_GRID = false
  let showGrid = DEFAULT_SHOW_GRID
  function setShowGrid(value: boolean): void {
    showGrid = value
    gridToggle.checked = value
  }
  gridToggle.addEventListener('change', () => setShowGrid(gridToggle.checked))

  let gridCols = DEFAULT_GRID_COLS
  let gridRows = DEFAULT_GRID_ROWS
  function setGridCols(cols: number): void {
    gridCols = cols
    gridRows = Math.round((cols * CAMERA_HEIGHT) / CAMERA_WIDTH)
    gridSlider.value = String(cols)
    gridValue.textContent = formatGridLabel(gridCols, gridRows)
  }
  gridSlider.addEventListener('input', () =>
    setGridCols(Number(gridSlider.value)),
  )

  resetButton.addEventListener('click', () => {
    setFps(DEFAULT_FPS)
    setGridCols(DEFAULT_GRID_COLS)
    setBinarize(DEFAULT_BINARIZE)
    setThreshold(BINARIZE_THRESHOLD)
    setShowGrid(DEFAULT_SHOW_GRID)
  })

  startCamera(video)

  let lastDrawTime = 0
  function loop(time: number) {
    const interval = 1000 / fps
    if (time - lastDrawTime >= interval) {
      lastDrawTime = time
      ctx.drawImage(video, 0, 0, CAMERA_WIDTH, CAMERA_HEIGHT)
      if (binarizeEnabled) {
        const imageData = ctx.getImageData(0, 0, CAMERA_WIDTH, CAMERA_HEIGHT)
        binarize(imageData, threshold)
        ctx.putImageData(imageData, 0, 0)
      }
      if (showGrid) {
        drawGrid(ctx, gridCols, gridRows)
      }
    }
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}
