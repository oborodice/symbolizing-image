import { writeFileSync } from 'node:fs'
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

const DEV_SERVER_PORT = 5184
const BASE_URL = `http://localhost:${DEV_SERVER_PORT}`

async function captureTrace(
  page: Page,
  client: CDPSession,
): Promise<Record<string, unknown>[]> {
  // これまでの計測でFPS低下の遷移が起きるのはページ読み込み後8〜11秒あたりだったため、
  // その前後を跨ぐように20秒間トレースを取得する
  const traceDurationMs = 20000
  // DevTools Performanceパネルが記録する内容のうち、GC/レイアウト/コンポジット/GPU関連のカテゴリ
  const traceCategories = [
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
    'blink.user_timing',
  ]

  const traceEvents: Record<string, unknown>[] = []
  client.on('Tracing.dataCollected', (event) => {
    traceEvents.push(...event.value)
  })
  const tracingComplete = new Promise<void>((resolve) => {
    client.once('Tracing.tracingComplete', () => resolve())
  })

  await client.send('Tracing.start', {
    traceConfig: { includedCategories: traceCategories },
  })

  await page.goto(BASE_URL)
  // 解像度変更はカメラ再起動を伴うため、トレース開始直後に設定を確定させてから計測窓に入る
  await applyDebugControls(page)
  console.log(
    `ページを読み込みました。${traceDurationMs / 1000}秒間トレースを取得します`,
  )
  await sleep(traceDurationMs)

  await client.send('Tracing.end')
  await tracingComplete

  return traceEvents
}

async function main(): Promise<void> {
  // scripts/generate-fake-camera-video/generate.shで生成した.y4mファイルへの絶対パス。
  // 指定しない場合はChromium組み込みの固定パターン(低エントロピー)のまま計測する
  const videoFile = getArgValue('--video-file')
  const outputPath = new URL('./trace.json', import.meta.url)

  console.log('開発サーバーを起動しています...')
  const devServer = startDevServer(DEV_SERVER_PORT)

  try {
    await waitForServer(BASE_URL)
    console.log('開発サーバーの準備ができました')

    // ヘッドレスではFPS低下が再現しないことを確認済みのため、常に実描画で起動する
    const { browser, page, client } = await setupBrowser(false, videoFile)

    const traceEvents = await captureTrace(page, client)

    await browser.close()

    writeFileSync(outputPath, JSON.stringify({ traceEvents }))
    console.log(`トレースを書き出しました: ${outputPath.pathname}`)
  } finally {
    stopDevServer(devServer)
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
