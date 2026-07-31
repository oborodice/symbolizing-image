import argparse
from collections import defaultdict

from perfetto.trace_processor import TraceProcessor

# scripts/capture-trace/index.tsのTRACE_CATEGORIESと対応させ、
# GC側とコンポジット/GPU側のどちらが指定区間で支配的かを見分けられるようにする
GC_CATEGORIES = {"v8", "disabled-by-default-v8.gc", "cppgc"}
COMPOSITOR_GPU_CATEGORIES = {"cc", "disabled-by-default-cc.debug", "gpu", "viz"}

TOP_N = 20

# 以下の集計はすべてSUM(dur)を使うが、これは親子・並行スライスの重複を含むため、
# 区間の実経過時間を超えうる(例: 7秒の区間で合計25秒など)。区間ごとの絶対値ではなく、
# before/after等、同じ集計方法どうしの相対比較としてのみ解釈すること


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="capture-traceで取得したtrace.jsonを、指定した時間帯(トレース開始からの秒数)で集計する",
    )
    parser.add_argument("trace_path", help="trace.jsonへのパス")
    parser.add_argument("--start", type=float, default=0.0, help="集計区間の開始(秒、既定は0)")
    parser.add_argument("--end", type=float, default=None, help="集計区間の終了(秒、省略時はトレース終端まで)")
    return parser.parse_args()


def resolve_window(trace_processor: TraceProcessor, start_sec: float, end_sec: float | None) -> tuple[int, int]:
    bounds = next(trace_processor.query("SELECT start_ts, end_ts FROM trace_bounds"))
    window_start_ns = bounds.start_ts + int(start_sec * 1e9)
    window_end_ns = bounds.start_ts + int(end_sec * 1e9) if end_sec is not None else bounds.end_ts
    return window_start_ns, window_end_ns


def print_category_breakdown(trace_processor: TraceProcessor, window_start_ns: int, window_end_ns: int) -> None:
    print("--- カテゴリ別 ---")
    rows = trace_processor.query(f"""
        SELECT category, COUNT(*) AS event_count, SUM(dur) AS total_dur_ns
        FROM slice
        WHERE ts BETWEEN {window_start_ns} AND {window_end_ns}
        GROUP BY category
        ORDER BY total_dur_ns DESC
        LIMIT {TOP_N}
    """)
    for row in rows:
        total_ms = (row.total_dur_ns or 0) / 1e6
        print(f"{total_ms:10.1f}ms  events={row.event_count:6d}  {row.category}")


def classify(category: str) -> str:
    tokens = set(category.split(","))
    is_gc = not tokens.isdisjoint(GC_CATEGORIES)
    is_compositor_gpu = not tokens.isdisjoint(COMPOSITOR_GPU_CATEGORIES)
    if is_gc and is_compositor_gpu:
        return "GC + Compositor/GPU"
    if is_gc:
        return "GC (v8/cppgc)"
    if is_compositor_gpu:
        return "Compositor/GPU (cc/gpu/viz)"
    return "other"


def print_bucketed_summary(trace_processor: TraceProcessor, window_start_ns: int, window_end_ns: int) -> None:
    print("\n--- GC vs Compositor/GPU 集計 ---")
    rows = trace_processor.query(f"""
        SELECT category, SUM(dur) AS total_dur_ns
        FROM slice
        WHERE ts BETWEEN {window_start_ns} AND {window_end_ns}
        GROUP BY category
    """)
    totals: defaultdict[str, float] = defaultdict(float)
    for row in rows:
        totals[classify(row.category)] += row.total_dur_ns or 0
    for bucket, total_dur_ns in sorted(totals.items(), key=lambda item: item[1], reverse=True):
        print(f"{total_dur_ns / 1e6:10.1f}ms  {bucket}")


def print_process_thread_breakdown(trace_processor: TraceProcessor, window_start_ns: int, window_end_ns: int) -> None:
    print("\n--- プロセス/スレッド別 ---")
    # スライスはスレッドに紐づく同期イベント(thread_track経由)と、プロセスに直接紐づく
    # 非同期イベント(process_track経由)の2種類があり、片方のJOINだけでは一方が欠落するため両方が要る
    rows = trace_processor.query(f"""
        SELECT
          COALESCE(p1.name, p2.name, '(unknown)') AS process_name,
          COALESCE(th.name, '') AS thread_name,
          COUNT(*) AS event_count,
          SUM(s.dur) AS total_dur_ns
        FROM slice s
        LEFT JOIN thread_track tt ON s.track_id = tt.id
        LEFT JOIN thread th ON tt.utid = th.utid
        LEFT JOIN process p1 ON th.upid = p1.upid
        LEFT JOIN process_track pt ON s.track_id = pt.id
        LEFT JOIN process p2 ON pt.upid = p2.upid
        WHERE s.ts BETWEEN {window_start_ns} AND {window_end_ns}
        GROUP BY process_name, thread_name
        ORDER BY total_dur_ns DESC
        LIMIT {TOP_N}
    """)
    for row in rows:
        total_ms = (row.total_dur_ns or 0) / 1e6
        print(f"{total_ms:10.1f}ms  events={row.event_count:6d}  {row.process_name} / {row.thread_name}")


def print_gpu_process_event_breakdown(trace_processor: TraceProcessor, window_start_ns: int, window_end_ns: int) -> None:
    print("\n--- GPU Process内のイベント名別 ---")
    rows = trace_processor.query(f"""
        SELECT
          s.name AS event_name,
          COUNT(*) AS event_count,
          SUM(s.dur) AS total_dur_ns
        FROM slice s
        LEFT JOIN thread_track tt ON s.track_id = tt.id
        LEFT JOIN thread th ON tt.utid = th.utid
        LEFT JOIN process p1 ON th.upid = p1.upid
        LEFT JOIN process_track pt ON s.track_id = pt.id
        LEFT JOIN process p2 ON pt.upid = p2.upid
        WHERE s.ts BETWEEN {window_start_ns} AND {window_end_ns}
          AND COALESCE(p1.name, p2.name) = 'GPU Process'
        GROUP BY event_name
        ORDER BY total_dur_ns DESC
        LIMIT {TOP_N}
    """)
    for row in rows:
        total_ms = (row.total_dur_ns or 0) / 1e6
        print(f"{total_ms:10.1f}ms  events={row.event_count:6d}  {row.event_name}")


def main() -> None:
    args = parse_args()
    trace_processor = TraceProcessor(trace=args.trace_path)

    window_start_ns, window_end_ns = resolve_window(trace_processor, args.start, args.end)

    end_label = "trace end" if args.end is None else f"{args.end}s"
    print(f"window: t={args.start}s .. {end_label}\n")

    print_category_breakdown(trace_processor, window_start_ns, window_end_ns)
    print_bucketed_summary(trace_processor, window_start_ns, window_end_ns)
    print_process_thread_breakdown(trace_processor, window_start_ns, window_end_ns)
    print_gpu_process_event_breakdown(trace_processor, window_start_ns, window_end_ns)

    trace_processor.close()


if __name__ == "__main__":
    main()
