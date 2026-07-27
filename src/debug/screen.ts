import './screen.css'
import { startCamera } from '../camera'
import { binarize } from '../binarize'
import { drawGrid, deriveGridRows, formatGridLabel } from '../grid'
import { computeBlockRects, type BlockRect } from '../blocks'
import {
  extractPatternBlocks,
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
import {
  RESOLUTION_PRESETS,
  DEFAULT_RESOLUTION,
  DEFAULT_GRID_COLS,
  DEFAULT_FPS,
  BINARIZE_THRESHOLD,
  PATTERN_SIZE,
} from '../config'

const MIN_FPS = 1
const MAX_FPS = 30

const MIN_GRID_COLS = 10
const MAX_GRID_COLS = 100

const MIN_BINARIZE_THRESHOLD = 0
const MAX_BINARIZE_THRESHOLD = 255

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
        Binarize threshold: <span id="binarize-threshold-value">${BINARIZE_THRESHOLD}</span>
        <input id="binarize-threshold-slider" type="range" min="${MIN_BINARIZE_THRESHOLD}" max="${MAX_BINARIZE_THRESHOLD}" value="${BINARIZE_THRESHOLD}" />
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
  let patternDb: PatternDb | null = null
  void loadPatternDb().then((db) => {
    patternDb = db
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

  let binarizeThreshold = BINARIZE_THRESHOLD
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
  let cachedCamWidth = -1
  let cachedCamHeight = -1
  let cachedGridCols = -1
  let cachedGridRows = -1
  function getBlockRects(): BlockRect[] {
    if (
      !cachedRects ||
      cachedCamWidth !== camWidth ||
      cachedCamHeight !== camHeight ||
      cachedGridCols !== gridCols ||
      cachedGridRows !== gridRows
    ) {
      cachedRects = computeBlockRects(camWidth, camHeight, gridCols, gridRows)
      cachedCamWidth = camWidth
      cachedCamHeight = camHeight
      cachedGridCols = gridCols
      cachedGridRows = gridRows
    }
    return cachedRects
  }

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
    setBinarizeThreshold(BINARIZE_THRESHOLD)
    setShowCamera(DEFAULT_SHOW_CAMERA)
    setShowChars(DEFAULT_SHOW_CHARS)
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
      // カメラ映像だけを鏡のように左右反転させる（自然な自撮り視点にするため）。
      // canvas全体をCSSで反転すると、後で描く文字まで鏡文字になってしまうため、
      // この映像描画だけを一時的に反転させ、文字の描画には影響させない
      ctx.save()
      ctx.scale(-1, 1)
      ctx.drawImage(video, -camWidth, 0, camWidth, camHeight)
      ctx.restore()

      const db = patternDb
      let blocks: PatternBlock[] | null = null
      // 切り出しの元は実際のカメラ映像でなければならないため、
      // 下の「showCameraがOFFの時にcanvasを黒く塗りつぶす処理」より前に済ませておく
      if (showChars && db) {
        blocks = extractPatternBlocks(canvas, getBlockRects(), PATTERN_SIZE)
        blocks.forEach((block) => {
          binarize(block.imageData, binarizeThreshold)
        })
      }

      if (!showCamera) {
        ctx.fillStyle = 'black'
        ctx.fillRect(0, 0, camWidth, camHeight)
      }
      if (blocks && db && fontsReady) {
        drawMatchedChars(ctx, blocks, db, patternDbMeta, packedBlock)
      }
      if (showGrid) {
        drawGrid(ctx, camWidth, camHeight, gridCols, gridRows)
      }
    }
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}
