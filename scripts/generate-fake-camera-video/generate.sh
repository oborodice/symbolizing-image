#!/bin/sh
set -eu

# Chromiumの--use-fake-device-for-media-streamは組み込みの固定パターン(緑背景+動く円+
# タイムスタンプ)しか出せず、低エントロピーで実際の映像負荷を再現しない。
# --use-file-for-fake-video-captureに渡すノイズ動画をここで生成する。
# 動画自体はサイズが大きくなる(フルHD・15秒で数GB)ためgit管理せず、
# このスクリプトで毎回同じコマンドで作り直す想定
# 解像度の既定値はsrc/screen/index.tsのDEFAULT_RESOLUTIONに合わせている。
# FPSは動画自身の更新頻度で、計測時のtarget-fps(MAX_FPS=30まで上げて上限を測ることが多い)
# より低いと、描画ループが同じ映像フレームを重複して処理しキャッシュヒット率を
# 底上げしてしまうため、MAX_FPS(30)に合わせて動画側も十分な頻度で更新されるようにする
WIDTH="${1:-640}"
HEIGHT="${2:-480}"
FPS="${3:-30}"
DURATION_SEC="${4:-15}"

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/videos"
OUTPUT_PATH="$OUTPUT_DIR/noise_${WIDTH}x${HEIGHT}_${FPS}fps.y4m"

mkdir -p "$OUTPUT_DIR"

# 黒を土台にすると輝度が2値化の閾値(既定128)を常に下回り、全ブロックが
# 同じ(ほぼ空白の)文字に収束してしまうため、土台をグレー(閾値付近)にする
ffmpeg -y \
  -f lavfi -i "color=c=gray:s=${WIDTH}x${HEIGHT}:r=${FPS}" \
  -vf "noise=alls=100:allf=t+u" \
  -t "$DURATION_SEC" \
  -pix_fmt yuv420p \
  "$OUTPUT_PATH"

echo "生成しました: $OUTPUT_PATH"
