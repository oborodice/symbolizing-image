import type { Page } from 'playwright'
import { getArgValue } from './cli-args.ts'
import { sleep } from './playwright-dev-session.ts'

async function setRangeInput(page: Page, selector: string, value: string): Promise<void> {
  await page.locator(selector).evaluate((el, value) => {
    ;(el as HTMLInputElement).value = value
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }, value)
}

export async function applyDebugControls(page: Page): Promise<void> {
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
