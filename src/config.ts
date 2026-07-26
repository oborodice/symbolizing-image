export interface Resolution {
  width: number
  height: number
  label: string
}

export const RESOLUTION_PRESETS: Resolution[] = [
  { width: 640, height: 480, label: '640x480 (4:3)' },
  { width: 1280, height: 720, label: '1280x720 (16:9)' },
  { width: 1920, height: 1080, label: '1920x1080 (16:9)' },
]

export const DEFAULT_RESOLUTION = RESOLUTION_PRESETS[0]

export const DEFAULT_GRID_COLS = 40
export const DEFAULT_GRID_ROWS = 30

export const DEFAULT_FPS = 15

export const BINARIZE_THRESHOLD = 128
