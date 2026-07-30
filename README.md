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

$ npx playwright install chromium                   # measure-fps-and-heap/capture-trace用、初回のみ
$ npx tsx scripts/measure-fps-and-heap/index.ts             # JSヒープ/Actual FPSの推移を計測(ヘッドレス)
$ npx tsx scripts/measure-fps-and-heap/index.ts --headed    # 実際に画面表示するモードで計測
$ npx tsx scripts/capture-trace/index.ts                    # FPS低下の遷移が起きる区間のCDPトレースを取得(trace.json)

$ uv sync --project scripts/analyze-trace                        # trace.json解析用のPython環境を用意(初回のみ、uvが必要)
$ uv run --project scripts/analyze-trace scripts/analyze-trace/main.py    # trace.jsonを解析
```
