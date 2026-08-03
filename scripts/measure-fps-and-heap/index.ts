import type { CDPSession, Page } from 'playwright'
import { getArgValue } from '../lib/cli-args.ts'
import {
  sleep,
  startDevServer,
  waitForServer,
  stopDevServer,
  setupBrowser,
} from '../lib/playwright-dev-session.ts'
import { applyDebugControls } from '../lib/debug-controls.ts'

const DEV_SERVER_PORT = 5183
const BASE_URL = `http://localhost:${DEV_SERVER_PORT}`

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

  console.log('開発サーバーを起動しています...')
  const devServer = startDevServer(DEV_SERVER_PORT)

  try {
    await waitForServer(BASE_URL)
    console.log('開発サーバーの準備ができました')

    const { browser, page, client } = await setupBrowser(headless, videoFile)
    await client.send('Performance.enable')

    await page.goto(BASE_URL)
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
