import { execSync } from 'node:child_process'
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

interface ProcessInfo {
  pid: number
  ppid: number
  rssKb: number
  command: string
}

function listProcesses(): ProcessInfo[] {
  // `ps -eo pid,ppid,rss,command`の1行分(pid, ppid, rss, commandの順)にマッチする
  const psLinePattern = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/
  const output = execSync('ps -eo pid,ppid,rss,command').toString()
  const processes: ProcessInfo[] = []
  // 先頭行はヘッダー("PID PPID RSS COMMAND")なので除く
  for (const line of output.split('\n').slice(1)) {
    const match = line.match(psLinePattern)
    if (match) {
      processes.push({
        pid: Number(match[1]),
        ppid: Number(match[2]),
        rssKb: Number(match[3]),
        command: match[4],
      })
    }
  }
  return processes
}

// このNode.jsプロセス自身の直接の子として起動されるChromeのトッププロセスを探す
// (chromium.launch()はブラウザ本体を直接の子プロセスとして起動する)
function findChromeRootPid(processes: ProcessInfo[]): number | undefined {
  return processes.find(
    (p) => p.ppid === process.pid && /chrome/i.test(p.command),
  )?.pid
}

// Chromeはブラウザ本体・GPU・レンダラー等、複数のプロセスに分かれているため、
// glyphキャッシュのアトラスcanvas(JSヒープの外で確保される)を含めた実際の使用量を見るには、
// トッププロセスだけでなくその子孫プロセス全部のRSSを合算する必要がある
function sumProcessTreeRssMb(rootPid: number, processes: ProcessInfo[]): number {
  const childrenByPpid = new Map<number, ProcessInfo[]>()
  for (const p of processes) {
    const siblings = childrenByPpid.get(p.ppid) ?? []
    siblings.push(p)
    childrenByPpid.set(p.ppid, siblings)
  }

  let totalRssKb = 0
  const stack = [rootPid]
  while (stack.length > 0) {
    const pid = stack.pop()!
    const proc = processes.find((p) => p.pid === pid)
    if (proc) {
      totalRssKb += proc.rssKb
    }
    for (const child of childrenByPpid.get(pid) ?? []) {
      stack.push(child.pid)
    }
  }
  return totalRssKb / 1024
}

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
//
// JSヒープ(Performance.getMetrics)だけでは、グリフを実際に描くアトラスcanvas
// (glyph-cache.tsのATLAS_SIZE=1024ページ、JSヒープの外に確保される)の分が見えない
// ため、Chromeのプロセスツリー全体のRSS(実メモリ使用量)も合わせて計測する
async function sweepGridCols(
  page: Page,
  client: CDPSession,
  chromeRootPid: number | undefined,
): Promise<void> {
  const gridStart = Number(getArgValue('--grid-start') ?? 10)
  const gridEnd = Number(getArgValue('--grid-end') ?? 100)
  const gridStep = Number(getArgValue('--grid-step') ?? 1)
  const dwellMs = Number(getArgValue('--dwell-ms') ?? 150)

  const baselineHeap = await readHeapUsed(client)
  const baselineRssMb = chromeRootPid
    ? sumProcessTreeRssMb(chromeRootPid, listProcesses())
    : undefined
  console.log(`baseline heap: ${(baselineHeap / 1024 / 1024).toFixed(2)}MB`)
  console.log(`baseline RSS: ${baselineRssMb?.toFixed(2) ?? 'N/A'}MB`)

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
  const finalRssMb = chromeRootPid
    ? sumProcessTreeRssMb(chromeRootPid, listProcesses())
    : undefined
  console.log(
    `final heap after grid sweep (${gridStart}-${gridEnd}, both colors): ${(finalHeap / 1024 / 1024).toFixed(2)}MB`,
  )
  console.log(
    `heap net growth: ${((finalHeap - baselineHeap) / 1024 / 1024).toFixed(2)}MB`,
  )
  console.log(`final RSS: ${finalRssMb?.toFixed(2) ?? 'N/A'}MB`)
  if (baselineRssMb !== undefined && finalRssMb !== undefined) {
    console.log(`RSS net growth: ${(finalRssMb - baselineRssMb).toFixed(2)}MB`)
  }
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

    const chromeRootPid = findChromeRootPid(listProcesses())
    if (chromeRootPid === undefined) {
      console.log('Chromeのプロセスが見つからなかったため、RSSは計測しません')
    }

    await page.goto(BASE_URL)
    await sleep(1500)

    // --resolutionを指定(展示で使う予定の1920x1080なら--resolution 2)
    await applyDebugControls(page)

    await sweepGridCols(page, client, chromeRootPid)

    await browser.close()
  } finally {
    stopDevServer(devServer)
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
