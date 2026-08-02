import type { CDPSession, Page } from 'playwright'
import { getArgValue } from '../lib/cli-args.ts'
import {
  sleep,
  startDevServer,
  waitForServer,
  stopDevServer,
  setupBrowser,
} from '../lib/playwright-dev-session.ts'
import { applyDebugControls, setRangeInput } from '../lib/debug-controls.ts'

const DEV_SERVER_PORT = 5187
const BASE_URL = `http://localhost:${DEV_SERVER_PORT}`

async function sweepGridColsOnce(
  page: Page,
  gridStart: number,
  gridEnd: number,
  gridStep: number,
  dwellMs: number,
): Promise<void> {
  for (let gridCols = gridStart; gridCols <= gridEnd; gridCols += gridStep) {
    await setRangeInput(page, '#grid-slider', String(gridCols))
    await sleep(dwellMs)
  }
}

async function readHeapUsed(client: CDPSession): Promise<number> {
  const { metrics } = await client.send('Performance.getMetrics')
  return metrics.find((metric) => metric.name === 'JSHeapUsedSize')?.value ?? 0
}

// グリフキャッシュ(src/render/glyph-cache.ts)のキーは(文字, フォントサイズ, 色)の組み合わせ
// で決まり、フォントサイズはグリッド列数(解像度固定なら)で決まる有限個の値しか取らない
// (docs/performance.mdの「グリフキャッシュが使われなくなったエントリ・ページを破棄しない問題」参照)。
// このスクリプトは「長時間稼働」させる代わりに、グリッド列数のスライダーを短時間で
// 全パターン踏破させ、最終的なヒープサイズを見ることで、実際の最悪ケースの目安を得る
async function sweepGridCols(
  page: Page,
  client: CDPSession,
): Promise<void> {
  const gridStart = Number(getArgValue('--grid-start') ?? 10)
  const gridEnd = Number(getArgValue('--grid-end') ?? 100)
  const gridStep = Number(getArgValue('--grid-step') ?? 1)
  const dwellMs = Number(getArgValue('--dwell-ms') ?? 150)

  const baselineHeap = await readHeapUsed(client)
  console.log(`baseline heap: ${(baselineHeap / 1024 / 1024).toFixed(2)}MB`)

  // show cameraの色(緑/黒)ごとに全グリッド範囲を1回ずつ掃引する。両方の色で
  // 全フォントサイズ分のグリフがキャッシュされる、展示での最悪ケースに相当する
  console.log('1周目(show camera ON、緑色の文字)')
  await sweepGridColsOnce(page, gridStart, gridEnd, gridStep, dwellMs)

  console.log('show cameraを切り替えます(黒色の文字)')
  await page.click('#show-camera-toggle')
  await sleep(dwellMs)

  console.log('2周目(show camera OFF、黒色の文字)')
  await sweepGridColsOnce(page, gridStart, gridEnd, gridStep, dwellMs)

  // キャッシュ/GCが落ち着くのを少し待ってから最終計測
  await sleep(3000)
  const finalHeap = await readHeapUsed(client)
  console.log(
    `final heap after grid sweep (${gridStart}-${gridEnd}, both colors): ${(finalHeap / 1024 / 1024).toFixed(2)}MB`,
  )
  console.log(
    `net growth: ${((finalHeap - baselineHeap) / 1024 / 1024).toFixed(2)}MB`,
  )
}

async function main(): Promise<void> {
  const videoFile = getArgValue('--video-file')

  console.log('開発サーバーを起動しています...')
  const devServer = startDevServer(DEV_SERVER_PORT)

  try {
    await waitForServer(BASE_URL)
    console.log('開発サーバーの準備ができました')

    // ヘッドレスだとカメラ映像の扱いが不安定になることがあるため、常に実描画で起動する
    const { browser, page, client } = await setupBrowser(false, videoFile)
    await client.send('Performance.enable')

    await page.goto(`${BASE_URL}/?debug`)
    await sleep(1500)

    // --resolutionを指定(展示で使う予定の1920x1080なら--resolution 2)
    await applyDebugControls(page)

    await sweepGridCols(page, client)

    await browser.close()
  } finally {
    stopDevServer(devServer)
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
