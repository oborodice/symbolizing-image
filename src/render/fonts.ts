import notoSansJpUrl from '@expo-google-fonts/noto-sans-jp/400Regular/NotoSansJP_400Regular.ttf?url'
import notoSansSiddhamUrl from '@expo-google-fonts/noto-sans-siddham/400Regular/NotoSansSiddham_400Regular.ttf?url'

export const NOTO_SANS_JP = 'Noto Sans JP'
export const NOTO_SANS_SIDDHAM = 'Noto Sans Siddham'

// canvasのfillTextはWebフォントの読み込み完了を自動では待たない（未読み込みの間は
// 黙ってフォールバックフォントで描画される）ため、描画を始める前に明示的に
// 読み込み・登録しておく必要がある
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
