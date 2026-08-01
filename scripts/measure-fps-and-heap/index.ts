import type { CDPSession, Page } from 'playwright'
import { getArgValue } from '../lib/cli-args.ts'
import {
  sleep,
  startDevServer,
  waitForServer,
  stopDevServer,
  setupBrowser,
} from '../lib/playwright-dev-session.ts'

const DEV_SERVER_PORT = 5183
const BASE_URL = `http://localhost:${DEV_SERVER_PORT}`
const DEBUG_URL = `${BASE_URL}/?debug`
const SAMPLE_INTERVAL_MS = 2000
const DEFAULT_DURATION_SEC = 3 * 60
// resolution-selectの変更はカメラの再起動を伴うため、切り替え後は落ち着くまで待つ
const RESOLUTION_CHANGE_SETTLE_MS = 1000
// headless(既定): ヘッドレスで実行。--headedを付けると実際に画面表示するモードで起動する
// (ヘッドレスvs実描画の違いがフロア到達に影響するかを比較検証するため)
const HEADLESS = !process.argv.includes('--headed')

// src/debug/screen.tsのRESOLUTION_PRESETSのインデックス(0=640x480, 1=1280x720, 2=1920x1080)
const RESOLUTION_INDEX = getArgValue('--resolution')
const TARGET_FPS = getArgValue('--target-fps')
const GRID_COLS = getArgValue('--grid-cols')
const DURATION_MS = Number(getArgValue('--duration') ?? DEFAULT_DURATION_SEC) * 1000
// scripts/generate-fake-camera-video/generate.shで生成した.y4mファイルへの絶対パス。
// 指定しない場合はChromium組み込みの固定パターン(低エントロピー)のまま計測する
const VIDEO_FILE = getArgValue('--video-file')

async function setRangeInput(page: Page, selector: string, value: string): Promise<void> {
  await page.locator(selector).evaluate((el, value) => {
    ;(el as HTMLInputElement).value = value
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }, value)
}

async function applyDebugControls(page: Page): Promise<void> {
  if (RESOLUTION_INDEX !== undefined) {
    console.log(`resolutionを${RESOLUTION_INDEX}に設定します`)
    await page.selectOption('#resolution-select', RESOLUTION_INDEX)
    await sleep(RESOLUTION_CHANGE_SETTLE_MS)
  }
  if (GRID_COLS !== undefined) {
    console.log(`grid-colsを${GRID_COLS}に設定します`)
    await setRangeInput(page, '#grid-slider', GRID_COLS)
  }
  if (TARGET_FPS !== undefined) {
    console.log(`target-fpsを${TARGET_FPS}に設定します`)
    await setRangeInput(page, '#fps-slider', TARGET_FPS)
  }
}

async function sampleLoop(page: Page, client: CDPSession): Promise<void> {
  const startTime = Date.now()
  while (Date.now() - startTime < DURATION_MS) {
    const { metrics } = await client.send('Performance.getMetrics')
    const heapUsed =
      metrics.find((metric) => metric.name === 'JSHeapUsedSize')?.value ?? 0
    const fps = await page.textContent('#actual-fps-value').catch(() => 'N/A')

    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1)
    const heapMb = (heapUsed / 1024 / 1024).toFixed(2)
    console.log(`t=${elapsedSec}s heapUsed=${heapMb}MB actualFps=${fps}`)

    await sleep(SAMPLE_INTERVAL_MS)
  }
}

async function main(): Promise<void> {
  console.log('開発サーバーを起動しています...')
  const devServer = startDevServer(DEV_SERVER_PORT)

  try {
    await waitForServer(BASE_URL)
    console.log('開発サーバーの準備ができました')

    const { browser, page, client } = await setupBrowser(HEADLESS, VIDEO_FILE)
    await client.send('Performance.enable')

    await page.goto(DEBUG_URL)
    console.log('ページを読み込みました')

    await applyDebugControls(page)

    console.log('計測を開始します')
    await sampleLoop(page, client)

    await browser.close()
  } finally {
    stopDevServer(devServer)
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
