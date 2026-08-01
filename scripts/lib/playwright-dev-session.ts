import { spawn, type ChildProcess } from 'node:child_process'
import { chromium, type Browser, type CDPSession, type Page } from 'playwright'

const SERVER_READY_TIMEOUT_MS = 30000
const SERVER_POLL_INTERVAL_MS = 300

const projectRoot = new URL('../../', import.meta.url)

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function startDevServer(port: number): ChildProcess {
  return spawn('npx', ['vite', '--port', String(port), '--strictPort'], {
    cwd: projectRoot,
    detached: true,
    stdio: 'ignore',
  })
}

export async function waitForServer(url: string): Promise<void> {
  const deadline = Date.now() + SERVER_READY_TIMEOUT_MS
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

export function stopDevServer(devServer: ChildProcess): void {
  if (devServer.pid) {
    // detached:trueでプロセスグループのリーダーになっているため、
    // 負のpidを指定してグループ全体(npx経由で起動したvite本体を含む)を終了させる
    process.kill(-devServer.pid, 'SIGTERM')
  }
}

export interface BrowserSession {
  browser: Browser
  page: Page
  client: CDPSession
}

export async function setupBrowser(
  headless: boolean,
  fakeVideoCaptureFile?: string,
): Promise<BrowserSession> {
  console.log(`ブラウザを起動します(headless=${headless})`)
  const args = [
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream',
  ]
  if (fakeVideoCaptureFile) {
    args.push(`--use-file-for-fake-video-capture=${fakeVideoCaptureFile}`)
  }
  const browser = await chromium.launch({ headless, args })
  const context = await browser.newContext()
  await context.grantPermissions(['camera'])
  const page = await context.newPage()
  const client = await context.newCDPSession(page)
  return { browser, page, client }
}
