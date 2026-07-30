import { writeFileSync } from 'node:fs'
import type { CDPSession, Page } from 'playwright'
import {
  sleep,
  startDevServer,
  waitForServer,
  stopDevServer,
  setupBrowser,
} from '../playwright-dev-session.ts'

const DEV_SERVER_PORT = 5184
const BASE_URL = `http://localhost:${DEV_SERVER_PORT}`
const DEBUG_URL = `${BASE_URL}/?debug`
// これまでの計測でFPS低下の遷移が起きるのはページ読み込み後8〜11秒あたりだったため、
// その前後を跨ぐように20秒間トレースを取得する
const TRACE_DURATION_MS = 20000
const OUTPUT_PATH = new URL('./trace.json', import.meta.url)

// DevTools Performanceパネルが記録する内容のうち、GC/レイアウト/コンポジット/GPU関連のカテゴリ
const TRACE_CATEGORIES = [
  'devtools.timeline',
  'disabled-by-default-devtools.timeline',
  'disabled-by-default-devtools.timeline.frame',
  'v8',
  'disabled-by-default-v8.gc',
  'cppgc',
  'cc',
  'disabled-by-default-cc.debug',
  'gpu',
  'viz',
]

async function captureTrace(
  page: Page,
  client: CDPSession,
): Promise<Record<string, unknown>[]> {
  const traceEvents: Record<string, unknown>[] = []
  client.on('Tracing.dataCollected', (event) => {
    traceEvents.push(...event.value)
  })
  const tracingComplete = new Promise<void>((resolve) => {
    client.once('Tracing.tracingComplete', () => resolve())
  })

  await client.send('Tracing.start', {
    traceConfig: { includedCategories: TRACE_CATEGORIES },
  })

  await page.goto(DEBUG_URL)
  console.log(
    `ページを読み込みました。${TRACE_DURATION_MS / 1000}秒間トレースを取得します`,
  )
  await sleep(TRACE_DURATION_MS)

  await client.send('Tracing.end')
  await tracingComplete

  return traceEvents
}

async function main(): Promise<void> {
  console.log('開発サーバーを起動しています...')
  const devServer = startDevServer(DEV_SERVER_PORT)

  try {
    await waitForServer(BASE_URL)
    console.log('開発サーバーの準備ができました')

    // ヘッドレスではFPS低下が再現しないことを確認済みのため、常に実描画で起動する
    const { browser, page, client } = await setupBrowser(false)

    const traceEvents = await captureTrace(page, client)

    await browser.close()

    writeFileSync(OUTPUT_PATH, JSON.stringify({ traceEvents }))
    console.log(`トレースを書き出しました: ${OUTPUT_PATH.pathname}`)
  } finally {
    stopDevServer(devServer)
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
