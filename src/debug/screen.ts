import './screen.css'
import { startCamera } from '../camera'
import { deriveGridRows } from '../grid'
import { drawGrid, formatGridLabel } from './grid'
import { computeBlockRects, type BlockRect } from '../blocks'
import {
  extractPatternBlocks,
  binarizeBlocks,
  type PatternBlock,
} from '../pattern/pattern-block'
import { bindRange, bindCheckbox } from './controls'
import {
  PATTERN_WORDS,
  loadPatternDb,
  type PatternDb,
} from '../pattern/pattern-db'
import { patternDbMeta } from '../pattern/pattern-db-meta'
import { loadFonts } from '../render/fonts'
import { drawMatchedChars } from '../render/draw-matched-chars'
import { drawMirroredCamera } from '../render/draw-mirrored-camera'
import { fillCanvas } from '../render/fill-canvas'
import { PATTERN_SIZE } from '../config'

interface Resolution {
  width: number
  height: number
  label: string
}

const RESOLUTION_PRESETS: Resolution[] = [
  { width: 640, height: 480, label: '640x480 (4:3)' },
  { width: 1280, height: 720, label: '1280x720 (16:9)' },
  { width: 1920, height: 1080, label: '1920x1080 (16:9)' },
]
const DEFAULT_RESOLUTION = RESOLUTION_PRESETS[0]

const MIN_FPS = 1
const MAX_FPS = 30
const DEFAULT_FPS = 15

const MIN_GRID_COLS = 10
const MAX_GRID_COLS = 100
const DEFAULT_GRID_COLS = 40

const MIN_BINARIZE_THRESHOLD = 0
const MAX_BINARIZE_THRESHOLD = 255
const DEFAULT_BINARIZE_THRESHOLD = 128

const DEFAULT_SHOW_GRID = false
const DEFAULT_SHOW_CAMERA = true
const DEFAULT_SHOW_CHARS = true

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
        Binarize threshold: <span id="binarize-threshold-value">${DEFAULT_BINARIZE_THRESHOLD}</span>
        <input id="binarize-threshold-slider" type="range" min="${MIN_BINARIZE_THRESHOLD}" max="${MAX_BINARIZE_THRESHOLD}" value="${DEFAULT_BINARIZE_THRESHOLD}" />
      </label>
      <label>
        <input id="show-camera-toggle" type="checkbox" ${DEFAULT_SHOW_CAMERA ? 'checked' : ''} />
        Show camera
      </label>
      <label>
        <input id="show-chars-toggle" type="checkbox" ${DEFAULT_SHOW_CHARS ? 'checked' : ''} />
        Show characters
      </label>
      <label>
        <input id="grid-toggle" type="checkbox" ${DEFAULT_SHOW_GRID ? 'checked' : ''} />
        Show grid
      </label>
      <label>
        Grid: <span id="grid-value">${formatGridLabel(DEFAULT_RESOLUTION.width, DEFAULT_RESOLUTION.height, DEFAULT_GRID_COLS, deriveGridRows(DEFAULT_GRID_COLS, DEFAULT_RESOLUTION.width, DEFAULT_RESOLUTION.height))}</span>
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
  const binarizeThresholdSlider = root.querySelector<HTMLInputElement>(
    '#binarize-threshold-slider',
  )!
  const binarizeThresholdValue = root.querySelector<HTMLSpanElement>(
    '#binarize-threshold-value',
  )!
  const showCameraToggle = root.querySelector<HTMLInputElement>(
    '#show-camera-toggle',
  )!
  const showCharsToggle = root.querySelector<HTMLInputElement>(
    '#show-chars-toggle',
  )!
  const gridToggle = root.querySelector<HTMLInputElement>('#grid-toggle')!
  const gridSlider = root.querySelector<HTMLInputElement>('#grid-slider')!
  const gridValue = root.querySelector<HTMLSpanElement>('#grid-value')!
  const resetButton = root.querySelector<HTMLButtonElement>('#reset-button')!
  const packedBlock = new Uint32Array(PATTERN_WORDS)
  let patternDbRef: PatternDb | null = null
  void loadPatternDb().then((db) => {
    patternDbRef = db
  })

  let fontsReady = false
  void loadFonts().then(() => {
    fontsReady = true
  })

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
  const setFps = bindRange(fpsSlider, fpsValue, String, (value) => {
    fps = value
  })

  let binarizeThreshold = DEFAULT_BINARIZE_THRESHOLD
  const setBinarizeThreshold = bindRange(
    binarizeThresholdSlider,
    binarizeThresholdValue,
    String,
    (value) => {
      binarizeThreshold = value
    },
  )

  let showCamera = DEFAULT_SHOW_CAMERA
  const setShowCamera = bindCheckbox(showCameraToggle, (value) => {
    showCamera = value
  })

  let showChars = DEFAULT_SHOW_CHARS
  const setShowChars = bindCheckbox(showCharsToggle, (value) => {
    showChars = value
  })

  let showGrid = DEFAULT_SHOW_GRID
  const setShowGrid = bindCheckbox(gridToggle, (value) => {
    showGrid = value
  })

  let gridCols = DEFAULT_GRID_COLS
  let gridRows = deriveGridRows(gridCols, camWidth, camHeight)
  const setGridCols = bindRange(
    gridSlider,
    gridValue,
    (cols) =>
      formatGridLabel(
        camWidth,
        camHeight,
        cols,
        deriveGridRows(cols, camWidth, camHeight),
      ),
    (value) => {
      gridCols = value
      gridRows = deriveGridRows(value, camWidth, camHeight)
    },
  )

  // camWidth/camHeight/gridCols/gridRowsが変わらない限り、ブロックの矩形は
  // 毎フレーム同じ結果になるので、値が変わった時だけ再計算する
  let cachedRects: BlockRect[] | null = null
  let cachedKey: readonly [number, number, number, number] | null = null
  function getBlockRects(): BlockRect[] {
    const key = [camWidth, camHeight, gridCols, gridRows] as const
    if (!cachedRects || key.some((value, i) => value !== cachedKey![i])) {
      cachedRects = computeBlockRects(camWidth, camHeight, gridCols, gridRows)
      cachedKey = key
    }
    return cachedRects
  }

  resolutionSelect.addEventListener('change', async () => {
    const preset = RESOLUTION_PRESETS[Number(resolutionSelect.value)]
    applyResolution(preset.width, preset.height)
    setGridCols(gridCols)
    await startCamera(video, camWidth, camHeight)
  })

  resetButton.addEventListener('click', async () => {
    resolutionSelect.value = String(
      RESOLUTION_PRESETS.indexOf(DEFAULT_RESOLUTION),
    )
    applyResolution(DEFAULT_RESOLUTION.width, DEFAULT_RESOLUTION.height)
    setFps(DEFAULT_FPS)
    setGridCols(DEFAULT_GRID_COLS)
    setBinarizeThreshold(DEFAULT_BINARIZE_THRESHOLD)
    setShowCamera(DEFAULT_SHOW_CAMERA)
    setShowChars(DEFAULT_SHOW_CHARS)
    setShowGrid(DEFAULT_SHOW_GRID)
    await startCamera(video, camWidth, camHeight)
  })

  applyResolution(camWidth, camHeight)
  startCamera(video, camWidth, camHeight)

  let lastDrawTime = 0
  function loop(timestamp: number) {
    requestAnimationFrame(loop)

    const interval = 1000 / fps
    if (timestamp - lastDrawTime < interval) {
      return
    }
    lastDrawTime = timestamp

    drawMirroredCamera(ctx, video, camWidth, camHeight)

    const patternDb = patternDbRef
    let blocks: PatternBlock[] | null = null
    // 切り出しの元は実際のカメラ映像でなければならないため、
    // 下の「showCameraがOFFの時にcanvasを白く塗りつぶす処理」より前に済ませておく
    if (showChars && patternDb) {
      blocks = extractPatternBlocks(canvas, getBlockRects(), PATTERN_SIZE)
      binarizeBlocks(blocks, binarizeThreshold)
    }

    if (!showCamera) {
      fillCanvas(ctx, camWidth, camHeight, 'rgb(255, 255, 255)')
    }
    if (blocks && patternDb && fontsReady) {
      // 映像に重ねる時は緑(視認性重視)、白背景の上では黒にする
      const charColor = showCamera ? 'rgb(0, 255, 0)' : 'rgb(0, 0, 0)'
      drawMatchedChars(
        ctx,
        blocks,
        patternDb,
        patternDbMeta,
        packedBlock,
        charColor,
      )
    }
    if (showGrid) {
      drawGrid(ctx, camWidth, camHeight, gridCols, gridRows)
    }
  }
  requestAnimationFrame(loop)
}
