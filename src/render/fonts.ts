import notoSansJpUrl from '@expo-google-fonts/noto-sans-jp/400Regular/NotoSansJP_400Regular.ttf?url'
import notoSansSiddhamUrl from '@expo-google-fonts/noto-sans-siddham/400Regular/NotoSansSiddham_400Regular.ttf?url'

export const NOTO_SANS_JP = 'Noto Sans JP'
export const NOTO_SANS_SIDDHAM = 'Noto Sans Siddham'

// canvasのfillTextにはWebフォントの読み込み完了を待つ仕組みがなく、未読み込みのまま
// 呼ぶとブラウザが自動でフォールバックフォントに差し替えて描画してしまう。それを避けるため、
// 描画を始める前にこの関数でフォントの読み込み完了を待ってから登録する
export async function loadFonts(): Promise<void> {
  const jp = new FontFace(NOTO_SANS_JP, `url(${notoSansJpUrl})`)
  const siddham = new FontFace(NOTO_SANS_SIDDHAM, `url(${notoSansSiddhamUrl})`)

  const [loadedJp, loadedSiddham] = await Promise.all([
    jp.load(),
    siddham.load(),
  ])

  document.fonts.add(loadedJp)
  document.fonts.add(loadedSiddham)
}
