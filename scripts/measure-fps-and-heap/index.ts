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

async function setRangeInput(page: Page, selector: string, value: string): Promise<void> {
  await page.locator(selector).evaluate((el, value) => {
    ;(el as HTMLInputElement).value = value
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }, value)
}

async function applyDebugControls(page: Page): Promise<void> {
  // resolution-selectの変更はカメラの再起動を伴うため、切り替え後は落ち着くまで待つ
  const resolutionChangeSettleMs = 1000
  // src/debug/screen.tsのRESOLUTION_PRESETSのインデックス(0=640x480, 1=1280x720, 2=1920x1080)
  const resolutionIndex = getArgValue('--resolution')
  const targetFps = getArgValue('--target-fps')
  const gridCols = getArgValue('--grid-cols')

  if (resolutionIndex !== undefined) {
    console.log(`resolutionを${resolutionIndex}に設定します`)
    await page.selectOption('#resolution-select', resolutionIndex)
    await sleep(resolutionChangeSettleMs)
  }
  if (gridCols !== undefined) {
    console.log(`grid-colsを${gridCols}に設定します`)
    await setRangeInput(page, '#grid-slider', gridCols)
  }
  if (targetFps !== undefined) {
    console.log(`target-fpsを${targetFps}に設定します`)
    await setRangeInput(page, '#fps-slider', targetFps)
  }
}

async function sampleLoop(page: Page, client: CDPSession): Promise<void> {
  const sampleIntervalMs = 2000
  const defaultDurationSec = 3 * 60
  const durationMs = Number(getArgValue('--duration') ?? defaultDurationSec) * 1000

  const startTime = Date.now()
  while (Date.now() - startTime < durationMs) {
    const { metrics } = await client.send('Performance.getMetrics')
    const heapUsed =
      metrics.find((metric) => metric.name === 'JSHeapUsedSize')?.value ?? 0
    const fps = await page.textContent('#actual-fps-value').catch(() => 'N/A')

    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1)
    const heapMb = (heapUsed / 1024 / 1024).toFixed(2)
    console.log(`t=${elapsedSec}s heapUsed=${heapMb}MB actualFps=${fps}`)

    await sleep(sampleIntervalMs)
  }
}

async function main(): Promise<void> {
  // headless(既定): ヘッドレスで実行。--headedを付けると実際に画面表示するモードで起動する
  // (ヘッドレスvs実描画の違いがフロア到達に影響するかを比較検証するため)
  const headless = !process.argv.includes('--headed')
  // scripts/generate-fake-camera-video/generate.shで生成した.y4mファイルへの絶対パス。
  // 指定しない場合はChromium組み込みの固定パターン(低エントロピー)のまま計測する
  const videoFile = getArgValue('--video-file')
  const debugUrl = `${BASE_URL}/?debug`

  console.log('開発サーバーを起動しています...')
  const devServer = startDevServer(DEV_SERVER_PORT)

  try {
    await waitForServer(BASE_URL)
    console.log('開発サーバーの準備ができました')

    const { browser, page, client } = await setupBrowser(headless, videoFile)
    await client.send('Performance.enable')

    await page.goto(debugUrl)
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
