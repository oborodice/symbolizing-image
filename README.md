# symbolizing-image

明滅する記号、磨かれる手触り

## Setup

```sh
$ mise trust
$ mise install
$ npm install
$ node scripts/fetch-jis-x0213-kanji/index.ts     # 対象漢字のコードポイント一覧を取得
$ node scripts/generate-pattern-db/index.ts       # 文字パターンDBを生成
$ npm run dev
$ open http://localhost:5173          # exhibition mode
$ open http://localhost:5173/?debug   # debug mode

$ npx playwright install chromium                   # measure-fps-and-heap用、初回のみ
$ npx tsx scripts/measure-fps-and-heap/index.ts             # JSヒープ/Actual FPSの推移を計測(ヘッドレス)
$ npx tsx scripts/measure-fps-and-heap/index.ts --headed    # 実際に画面表示するモードで計測
```
