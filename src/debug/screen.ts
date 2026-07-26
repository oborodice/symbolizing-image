import './screen.css'
import { startCamera } from '../camera'
import { binarize } from '../binarize'
import {
  RESOLUTION_PRESETS,
  DEFAULT_RESOLUTION,
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

function formatGridLabel(
  camWidth: number,
  camHeight: number,
  cols: number,
  rows: number,
): string {
  const blockWidth = camWidth / cols
  const blockHeight = camHeight / rows
  return `${cols} x ${rows} (${blockWidth.toFixed(1)} x ${blockHeight.toFixed(1)}px)`
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  camWidth: number,
  camHeight: number,
  cols: number,
  rows: number,
): void {
  const cellWidth = camWidth / cols
  const cellHeight = camHeight / rows

  ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let col = 1; col < cols; col++) {
    const x = col * cellWidth
    ctx.moveTo(x, 0)
    ctx.lineTo(x, camHeight)
  }
  for (let row = 1; row < rows; row++) {
    const y = row * cellHeight
    ctx.moveTo(0, y)
    ctx.lineTo(camWidth, y)
  }
  ctx.stroke()
}

export function renderDebugScreen(root: HTMLElement): void {
  root.classList.add('debug-screen')
  root.innerHTML = `
    <h1>DEBUG MODE</h1>
    <video id="camera" autoplay playsinline muted hidden></video>
    <canvas id="preview"></canvas>
    <div class="controls">
      <label>
        Resolution:
        <select id="resolution-select">
          ${RESOLUTION_PRESETS.map((r, i) => `<option value="${i}">${r.label}</option>`).join('')}
        </select>
      </label>
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
        Grid: <span id="grid-value">${formatGridLabel(DEFAULT_RESOLUTION.width, DEFAULT_RESOLUTION.height, DEFAULT_GRID_COLS, DEFAULT_GRID_ROWS)}</span>
        <input id="grid-slider" type="range" min="${MIN_GRID_COLS}" max="${MAX_GRID_COLS}" value="${DEFAULT_GRID_COLS}" />
      </label>
      <button id="reset-button" type="button">Reset parameters</button>
    </div>
  `

  const video = root.querySelector<HTMLVideoElement>('#camera')!
  const canvas = root.querySelector<HTMLCanvasElement>('#preview')!
  const ctx = canvas.getContext('2d')!
  const resolutionSelect =
    root.querySelector<HTMLSelectElement>('#resolution-select')!
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

  let camWidth = DEFAULT_RESOLUTION.width
  let camHeight = DEFAULT_RESOLUTION.height
  function applyResolution(width: number, height: number): void {
    camWidth = width
    camHeight = height
    video.width = width
    video.height = height
    canvas.width = width
    canvas.height = height
  }

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
    gridRows = Math.round((cols * camHeight) / camWidth)
    gridSlider.value = String(cols)
    gridValue.textContent = formatGridLabel(
      camWidth,
      camHeight,
      gridCols,
      gridRows,
    )
  }
  gridSlider.addEventListener('input', () =>
    setGridCols(Number(gridSlider.value)),
  )

  let stream: MediaStream | null = null
  async function restartCamera(): Promise<void> {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
    }
    stream = await startCamera(video, camWidth, camHeight)
  }

  resolutionSelect.addEventListener('change', async () => {
    const preset = RESOLUTION_PRESETS[Number(resolutionSelect.value)]
    applyResolution(preset.width, preset.height)
    setGridCols(gridCols)
    await restartCamera()
  })

  resetButton.addEventListener('click', async () => {
    resolutionSelect.value = '0'
    applyResolution(DEFAULT_RESOLUTION.width, DEFAULT_RESOLUTION.height)
    setFps(DEFAULT_FPS)
    setGridCols(DEFAULT_GRID_COLS)
    setBinarize(DEFAULT_BINARIZE)
    setThreshold(BINARIZE_THRESHOLD)
    setShowGrid(DEFAULT_SHOW_GRID)
    await restartCamera()
  })

  applyResolution(camWidth, camHeight)
  restartCamera()

  let lastDrawTime = 0
  function loop(time: number) {
    const interval = 1000 / fps
    if (time - lastDrawTime >= interval) {
      lastDrawTime = time
      ctx.drawImage(video, 0, 0, camWidth, camHeight)
      if (binarizeEnabled) {
        const imageData = ctx.getImageData(0, 0, camWidth, camHeight)
        binarize(imageData, threshold)
        ctx.putImageData(imageData, 0, 0)
      }
      if (showGrid) {
        drawGrid(ctx, camWidth, camHeight, gridCols, gridRows)
      }
    }
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}
