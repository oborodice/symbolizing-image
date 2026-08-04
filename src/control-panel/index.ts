import './control-panel.css'
import { bindRange, bindCheckbox } from '../controls'
import { deriveGridRows } from '../grid'

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
const MAX_FPS = 60
const DEFAULT_FPS = 15

const MIN_GRID_COLS = 10
const MAX_GRID_COLS = 100
const DEFAULT_GRID_COLS = 40

const DEFAULT_SHOW_GRID = false
const DEFAULT_SHOW_CAMERA = true
const DEFAULT_SHOW_CHARS = true

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

// 来場者向けの画面出力(screen)には映らない、操作・調整用のパネル。
// レンダリングループ側の状態はcallbacksを通じてのみ受け渡し、このモジュール自身は
// 保持しない(唯一の例外はグリッドラベルの再計算に使うcamWidth/camHeight/gridCols)
export interface ControlPanelCallbacks {
  onResolutionChange: (width: number, height: number) => void
  onFpsChange: (fps: number) => void
  onShowCameraChange: (show: boolean) => void
  onShowCharsChange: (show: boolean) => void
  onShowGridChange: (show: boolean) => void
  onGridColsChange: (cols: number) => void
}

export interface ControlPanel {
  setActualFps(text: string): void
  setBinarizeThreshold(text: string): void
}

export function renderControlPanel(
  root: HTMLElement,
  callbacks: ControlPanelCallbacks,
): ControlPanel {
  // rootはこのパネル専用のコンテナ(呼び出し側が用意する)である前提のため、
  // 中身を気にせず上書きしてよい
  root.innerHTML = `
    <div class="controls" hidden>
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
      <div>Actual FPS: <span id="actual-fps-value">-</span></div>
      <div>Binarize threshold: <span id="binarize-threshold-value">-</span></div>
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

  const panel = root.querySelector<HTMLDivElement>('.controls')!
  const resolutionSelect = panel.querySelector<HTMLSelectElement>(
    '#resolution-select',
  )!
  const fpsSlider = panel.querySelector<HTMLInputElement>('#fps-slider')!
  const fpsValue = panel.querySelector<HTMLSpanElement>('#fps-value')!
  const actualFpsValue = panel.querySelector<HTMLSpanElement>(
    '#actual-fps-value',
  )!
  const binarizeThresholdValue = panel.querySelector<HTMLSpanElement>(
    '#binarize-threshold-value',
  )!
  const showCameraToggle = panel.querySelector<HTMLInputElement>(
    '#show-camera-toggle',
  )!
  const showCharsToggle = panel.querySelector<HTMLInputElement>(
    '#show-chars-toggle',
  )!
  const gridToggle = panel.querySelector<HTMLInputElement>('#grid-toggle')!
  const gridSlider = panel.querySelector<HTMLInputElement>('#grid-slider')!
  const gridValue = panel.querySelector<HTMLSpanElement>('#grid-value')!
  const resetButton = panel.querySelector<HTMLButtonElement>('#reset-button')!

  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'c') {
      panel.hidden = !panel.hidden
    }
  })

  // グリッドラベルの再計算(camWidth/camHeight/cols x rowsの表示)にのみ使う。
  // レンダリングループ側の同名の状態とは独立した、パネル表示専用のコピー
  let camWidth = DEFAULT_RESOLUTION.width
  let camHeight = DEFAULT_RESOLUTION.height
  let gridCols = DEFAULT_GRID_COLS

  function refreshGridLabel(): void {
    gridValue.textContent = formatGridLabel(
      camWidth,
      camHeight,
      gridCols,
      deriveGridRows(gridCols, camWidth, camHeight),
    )
  }

  function selectResolution(index: number): void {
    resolutionSelect.value = String(index)
    const preset = RESOLUTION_PRESETS[index]
    camWidth = preset.width
    camHeight = preset.height
    refreshGridLabel()
    callbacks.onResolutionChange(preset.width, preset.height)
  }

  resolutionSelect.addEventListener('change', () => {
    selectResolution(Number(resolutionSelect.value))
  })

  const setFps = bindRange(fpsSlider, fpsValue, String, callbacks.onFpsChange)

  const setShowCamera = bindCheckbox(
    showCameraToggle,
    callbacks.onShowCameraChange,
  )
  const setShowChars = bindCheckbox(
    showCharsToggle,
    callbacks.onShowCharsChange,
  )
  const setShowGrid = bindCheckbox(gridToggle, callbacks.onShowGridChange)

  const setGridCols = bindRange(
    gridSlider,
    gridValue,
    (cols) => {
      gridCols = cols
      return formatGridLabel(
        camWidth,
        camHeight,
        cols,
        deriveGridRows(cols, camWidth, camHeight),
      )
    },
    callbacks.onGridColsChange,
  )

  function applyDefaults(): void {
    selectResolution(RESOLUTION_PRESETS.indexOf(DEFAULT_RESOLUTION))
    setFps(DEFAULT_FPS)
    setGridCols(DEFAULT_GRID_COLS)
    setShowCamera(DEFAULT_SHOW_CAMERA)
    setShowChars(DEFAULT_SHOW_CHARS)
    setShowGrid(DEFAULT_SHOW_GRID)
  }

  resetButton.addEventListener('click', applyDefaults)

  // 初期値をcallbacks経由でscreen側にも伝える(bindRange/bindCheckboxのapplyが
  // onChangeを呼ぶため、この呼び出しだけで両側の状態が揃う)
  applyDefaults()

  return {
    setActualFps(text: string): void {
      actualFpsValue.textContent = text
    },
    setBinarizeThreshold(text: string): void {
      binarizeThresholdValue.textContent = text
    },
  }
}
