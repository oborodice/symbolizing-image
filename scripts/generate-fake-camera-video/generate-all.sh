#!/bin/sh
set -eu

# src/debug/screen.tsのRESOLUTION_PRESETS全種類分をまとめて生成しておくことで、
# 解像度スイープの計測前に毎回ffmpegを待たずに済むようにする。
# 以下の解像度はRESOLUTION_PRESETSの値を手動で複製したものなので、
# 向こうが変わった場合はここも合わせて更新する
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
FPS="${1:-15}"
DURATION_SEC="${2:-15}"

"$SCRIPT_DIR/generate.sh" 640 480 "$FPS" "$DURATION_SEC"
"$SCRIPT_DIR/generate.sh" 1280 720 "$FPS" "$DURATION_SEC"
"$SCRIPT_DIR/generate.sh" 1920 1080 "$FPS" "$DURATION_SEC"
