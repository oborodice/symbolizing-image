import './screen.css'
import { startCamera } from '../camera'
import { deriveGridRows } from '../grid'
import { drawGrid } from './draw-grid'
import { computeBlockRects, type BlockRect } from '../blocks'
import {
  extractPatternBlocks,
  binarizeBlocks,
  type PatternBlock,
} from '../pattern/pattern-block'
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
import { clearGlyphCache } from '../render/glyph-cache'
import { PATTERN_SIZE } from '../config'
import { renderControlPanel } from '../control-panel'

export function renderScreen(root: HTMLElement): void {
  root.classList.add('screen')
  root.innerHTML = `
    <video id="camera" autoplay playsinline muted hidden></video>
    <canvas id="output"></canvas>
    <div id="control-panel-root"></div>
  `

  const video = root.querySelector<HTMLVideoElement>('#camera')!
  const canvas = root.querySelector<HTMLCanvasElement>('#output')!
  const ctx = canvas.getContext('2d')!
  const controlPanelRoot = root.querySelector<HTMLDivElement>(
    '#control-panel-root',
  )!

  const packedBlock = new Uint32Array(PATTERN_WORDS)
  let patternDbRef: PatternDb | null = null
  void loadPatternDb().then((patternDb) => {
    patternDbRef = patternDb
  })

  let fontsReady = false
  void loadFonts().then(() => {
    fontsReady = true
  })

  let camWidth = 0
  let camHeight = 0
  function applyResolution(width: number, height: number): void {
    camWidth = width
    camHeight = height
    video.width = width
    video.height = height
    canvas.width = width
    canvas.height = height
    // 解像度が変わるとブロックの高さ(→フォントサイズ)も変わり、それまでの
    // グリフキャッシュが死蔵データになるため空にする
    clearGlyphCache()
    void startCamera(video, camWidth, camHeight)
  }

  // 以下の状態(fps・binarizeThreshold・show*・gridCols/gridRows)は、いずれも
  // 下のrenderControlPanelのcallbacksを通じてのみ更新される。パネル側が起動時に
  // 一度デフォルト値でcallbacksを呼ぶため、ここでの初期値はプレースホルダーでよい
  let fps = 0
  let binarizeThreshold = 0
  let showCamera = false
  let showChars = false
  let showGrid = false
  let gridCols = 0
  let gridRows = 0

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

  const panel = renderControlPanel(controlPanelRoot, {
    onResolutionChange: (width, height) => {
      applyResolution(width, height)
    },
    onFpsChange: (value) => {
      fps = value
    },
    onBinarizeThresholdChange: (value) => {
      binarizeThreshold = value
    },
    onShowCameraChange: (value) => {
      showCamera = value
    },
    onShowCharsChange: (value) => {
      showChars = value
    },
    onShowGridChange: (value) => {
      showGrid = value
    },
    onGridColsChange: (cols) => {
      gridCols = cols
      gridRows = deriveGridRows(cols, camWidth, camHeight)
      // グリッド数が変わるとブロックの高さ(→フォントサイズ)も変わり、それまでの
      // グリフキャッシュが死蔵データになるため空にする
      clearGlyphCache()
    },
  })

  let lastDrawTime = 0

  // 直近1秒間に実際に描画できた回数を集計し、狙っているfpsとの差を可視化する
  let actualFrameCount = 0
  let actualFpsWindowStart = 0
  function recordActualFrame(timestamp: number): void {
    actualFrameCount++
    const elapsed = timestamp - actualFpsWindowStart
    if (elapsed < 1000) {
      return
    }
    panel.setActualFps((actualFrameCount / (elapsed / 1000)).toFixed(1))
    actualFrameCount = 0
    actualFpsWindowStart = timestamp
  }

  function loop(timestamp: number) {
    requestAnimationFrame(loop)

    const interval = 1000 / fps
    if (timestamp - lastDrawTime < interval) {
      return
    }
    lastDrawTime = timestamp
    recordActualFrame(timestamp)

    drawMirroredCamera(ctx, video, camWidth, camHeight)

    const patternDb = patternDbRef
    let blocks: PatternBlock[] | null = null
    // 切り出しの元は実際のカメラ映像でなければならないため、
    // 下の「showCameraがOFFの時にcanvasを白く塗りつぶす処理」より前に済ませておく
    if (showChars && patternDb) {
      blocks = extractPatternBlocks(
        canvas,
        camWidth,
        camHeight,
        getBlockRects(),
        PATTERN_SIZE,
        gridCols,
        gridRows,
      )
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
