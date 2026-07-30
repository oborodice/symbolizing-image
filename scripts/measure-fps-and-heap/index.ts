import { spawn, type ChildProcess } from 'node:child_process'
import { chromium, type Browser, type CDPSession, type Page } from 'playwright'

const DEV_SERVER_PORT = 5183
const BASE_URL = `http://localhost:${DEV_SERVER_PORT}`
const DEBUG_URL = `${BASE_URL}/?debug`
const SAMPLE_INTERVAL_MS = 2000
const DURATION_MS = 3 * 60 * 1000
const SERVER_READY_TIMEOUT_MS = 30000
const SERVER_POLL_INTERVAL_MS = 300
// headless(既定): ヘッドレスで実行。--headedを付けると実際に画面表示するモードで起動する
// (ヘッドレスvs実描画の違いがフロア到達に影響するかを比較検証するため)
const HEADLESS = !process.argv.includes('--headed')

const projectRoot = new URL('../../', import.meta.url)

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function startDevServer(): ChildProcess {
  return spawn(
    'npx',
    ['vite', '--port', String(DEV_SERVER_PORT), '--strictPort'],
    {
      cwd: projectRoot,
      detached: true,
      stdio: 'ignore',
    },
  )
}

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // まだ起動していない。再試行する
    }
    await sleep(SERVER_POLL_INTERVAL_MS)
  }
  throw new Error('Dev server did not become ready in time')
}

interface BrowserSession {
  browser: Browser
  page: Page
  client: CDPSession
}

async function setupBrowser(): Promise<BrowserSession> {
  console.log(`ブラウザを起動します(headless=${HEADLESS})`)
  const browser = await chromium.launch({
    headless: HEADLESS,
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
    ],
  })
  const context = await browser.newContext()
  await context.grantPermissions(['camera'])
  const page = await context.newPage()

  const client = await context.newCDPSession(page)
  await client.send('Performance.enable')

  return { browser, page, client }
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

function stopDevServer(devServer: ChildProcess): void {
  if (devServer.pid) {
    // detached:trueでプロセスグループのリーダーになっているため、
    // 負のpidを指定してグループ全体(npx経由で起動したvite本体を含む)を終了させる
    process.kill(-devServer.pid, 'SIGTERM')
  }
}

async function main(): Promise<void> {
  console.log('開発サーバーを起動しています...')
  const devServer = startDevServer()

  try {
    await waitForServer(BASE_URL, SERVER_READY_TIMEOUT_MS)
    console.log('開発サーバーの準備ができました')

    const { browser, page, client } = await setupBrowser()

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
