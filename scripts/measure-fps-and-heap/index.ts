import type { CDPSession, Page } from 'playwright'
import {
  sleep,
  startDevServer,
  waitForServer,
  stopDevServer,
  setupBrowser,
} from '../playwright-dev-session.ts'

const DEV_SERVER_PORT = 5183
const BASE_URL = `http://localhost:${DEV_SERVER_PORT}`
const DEBUG_URL = `${BASE_URL}/?debug`
const SAMPLE_INTERVAL_MS = 2000
const DURATION_MS = 3 * 60 * 1000
// headless(既定): ヘッドレスで実行。--headedを付けると実際に画面表示するモードで起動する
// (ヘッドレスvs実描画の違いがフロア到達に影響するかを比較検証するため)
const HEADLESS = !process.argv.includes('--headed')

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

    const { browser, page, client } = await setupBrowser(HEADLESS)
    await client.send('Performance.enable')

    await page.goto(DEBUG_URL)
    console.log('ページを読み込みました。計測を開始します')

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
