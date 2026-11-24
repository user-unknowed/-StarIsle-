"""
reporting.py - 验收测试结果汇总与报告生成

所属模块：ai-engine/tests/acceptance
功能简述：
    收集各验收用例记录的指标（耗时、阈值、结论），在测试会话结束时
    生成 Markdown 与 JSON 两份报告，用于核对 MVP 指标是否达标。
依赖关系：
    - json / os / time：报告落盘与时间戳
"""
import json
import os
import time
from typing import Dict, List, Optional

# 会话级记录：所有用例通过 record() 追加，结束时统一落盘
_records: List[Dict] = []
_env: Dict = {}
_started_at = time.time()


def set_env(info: Dict) -> None:
    """记录被测服务环境信息（模型模式、推理设备、模型名）。"""
    global _env
    _env = dict(info or {})


def record(
    name: str,
    category: str,
    status: str = "pass",
    metrics: Optional[Dict] = None,
    detail: str = "",
) -> None:
    """
    记录一条验收结果。

    Args:
        name: 用例名称
        category: 用例类别（contract / perf / resilience）
        status: 结论（pass / fail / skipped）
        metrics: 指标字典，如 {"p95_ms": 1234, "threshold_ms": 3000}
        detail: 补充说明
    """
    _records.append({
        "name": name,
        "category": category,
        "status": status,
        "metrics": metrics or {},
        "detail": detail,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
    })


def percentile(values: List[float], p: float) -> float:
    """线性插值计算分位数（样本不足时退化为最大值）。"""
    if not values:
        return 0.0
    if len(values) == 1:
        return float(values[0])
    ordered = sorted(values)
    pos = (len(ordered) - 1) * p / 100.0
    low = int(pos)
    high = min(low + 1, len(ordered) - 1)
    return float(ordered[low] + (ordered[high] - ordered[low]) * (pos - low))


def p95(values: List[float]) -> float:
    """P95 耗时（毫秒），保留 1 位小数。"""
    return round(percentile(values, 95), 1)


def _status_icon(status: str) -> str:
    return {"pass": "PASS", "fail": "FAIL", "skipped": "SKIP"}.get(status, status)


def write_reports(outdir: str, extra: Optional[Dict] = None) -> Dict[str, str]:
    """
    生成 JSON 与 Markdown 报告。

    Args:
        outdir: 报告输出目录
        extra: 额外写入报告的信息（如 MVP 指标汇总）

    Returns:
        Dict[str, str]: {"json": 路径, "markdown": 路径}
    """
    os.makedirs(outdir, exist_ok=True)
    ts = time.strftime("%Y%m%d_%H%M%S")
    json_path = os.path.join(outdir, f"acceptance_{ts}.json")
    md_path = os.path.join(outdir, f"acceptance_{ts}.md")

    payload = {
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "duration_s": round(time.time() - _started_at, 1),
        "environment": _env,
        "mvp_summary": extra or {},
        "records": _records,
    }
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    lines = [
        "# 星屿 AI 引擎上线验收报告",
        "",
        f"- 生成时间：{payload['generated_at']}",
        f"- 耗时：{payload['duration_s']} 秒",
        f"- 模型模式：{_env.get('model_mode', 'unknown')}",
        f"- 推理设备：{_env.get('device', 'unknown')}",
        f"- 模型：{_env.get('model', 'unknown')}",
        "",
    ]

    summary = extra or {}
    if summary:
        lines += ["## MVP 指标核对", "", "| 指标 | 门槛 | 实测 | 结论 |", "| --- | --- | --- | --- |"]
        for key, item in summary.items():
            lines.append(
                f"| {item.get('label', key)} | {item.get('threshold')} | "
                f"{item.get('measured')} | {item.get('verdict')} |"
            )
        lines.append("")

    lines += ["## 用例明细", "", "| 类别 | 用例 | 结论 | 指标 |", "| --- | --- | --- | --- |"]
    for r in _records:
        metrics = ", ".join(f"{k}={v}" for k, v in r["metrics"].items()) or "-"
        lines.append(f"| {r['category']} | {r['name']} | {_status_icon(r['status'])} | {metrics} |")
    lines.append("")

    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    return {"json": json_path, "markdown": md_path}
