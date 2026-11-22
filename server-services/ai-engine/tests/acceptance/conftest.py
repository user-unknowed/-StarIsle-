"""
conftest.py - 验收测试公共夹具

所属模块：ai-engine/tests/acceptance
功能简述：
    提供被测服务地址、HTTP 客户端、服务环境（/health）等会话级夹具，
    并在会话结束时汇总生成验收报告。
依赖关系：
    - httpx：HTTP 客户端
    - tests.acceptance.reporting：报告生成
"""
import os

import httpx
import pytest

from tests.acceptance import reporting

# 被测服务地址，可通过环境变量覆盖（默认本机 8000）
BASE_URL = os.getenv("AI_ENGINE_BASE_URL", "http://127.0.0.1:8000")

# MVP 门槛（只允许调低，不允许调高）
THRESHOLDS = {
    "chat_p95_ms": 3000,      # FR-3.1 对话响应 P95 < 3s
    "l1_keyword_ms": 500,     # FR-6.1 L1 关键词 < 500ms
    "l1_false_positive": 0.05,  # FR-6.1 误报率 < 5%
    "semantic_ms": 5000,      # FR-6.2 语义分析 < 5s
    "semantic_recall": 0.85,  # FR-6.2 召回 > 85%
    "crisis_ms": 2000,        # FR-6.3 红色风险 -> 危机话术 < 2s
}

# 本地 CPU 推理时 /chat 无法满足 3s，仅记录实测不判失败
PERF_CHAT_SAMPLES = int(os.getenv("PERF_CHAT_SAMPLES", "3"))


@pytest.fixture(scope="session")
def base_url() -> str:
    """被测服务基础地址。"""
    return BASE_URL.rstrip("/")


@pytest.fixture(scope="session")
def client(base_url):
    """
    同步 HTTP 客户端（会话级复用）。

    超时放宽到 180s，兼容本地 CPU 推理与模型首次加载。
    """
    with httpx.Client(base_url=base_url, timeout=180.0) as c:
        yield c


@pytest.fixture(scope="session")
def health(client) -> dict:
    """读取 /health，作为环境判定依据。"""
    resp = client.get("/health")
    assert resp.status_code == 200, f"/health 返回 {resp.status_code}"
    return resp.json()


@pytest.fixture(scope="session")
def device(health) -> str:
    """推理设备（cpu / cuda）。"""
    return str(health.get("device", "cpu"))


@pytest.fixture(scope="session", autouse=True)
def _acceptance_report():
    """
    会话级自动夹具：测试结束后汇总生成 JSON/Markdown 报告。

    环境信息获取失败时不阻断报告生成，仅记录 unknown。
    """
    yield

    env = {}
    try:
        with httpx.Client(base_url=BASE_URL.rstrip("/"), timeout=10.0) as c:
            env = c.get("/health").json()
    except Exception:
        env = {"status": "unreachable"}

    reporting.set_env(env)
    outdir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reports")
    try:
        paths = reporting.write_reports(outdir, extra=_summarize())
        print(f"\n[acceptance] 报告已生成: {paths['markdown']}")
        print(f"[acceptance] JSON: {paths['json']}")
    except Exception as e:  # 报告失败不影响测试结论
        print(f"\n[acceptance] 报告生成失败: {e}")


def _summarize() -> dict:
    """从已记录指标中提炼 MVP 门槛核对表。"""
    summary = {}

    def last_metric(key):
        for r in reversed(reporting._records):
            if key in r["metrics"]:
                return r["metrics"][key], r["status"]
        return None, None

    def verdict(status: str) -> str:
        return {"pass": "达标", "skipped": "未判定（仅记录）"}.get(status, "未达标")

    chat_p95, chat_status = last_metric("chat_p95_ms")
    if chat_p95 is not None:
        summary["chat_p95"] = {
            "label": "对话响应 P95 (FR-3.1)",
            "threshold": f"< {THRESHOLDS['chat_p95_ms']} ms",
            "measured": f"{chat_p95} ms",
            "verdict": verdict(chat_status),
        }

    l1_p95, l1_status = last_metric("l1_p95_ms")
    if l1_p95 is not None:
        summary["l1_p95"] = {
            "label": "L1 关键词响应 P95 (FR-6.1)",
            "threshold": f"< {THRESHOLDS['l1_keyword_ms']} ms",
            "measured": f"{l1_p95} ms",
            "verdict": "达标" if l1_status == "pass" else "未达标",
        }

    recall, recall_status = last_metric("semantic_recall")
    if recall is not None:
        summary["semantic_recall"] = {
            "label": "语义风险召回 (FR-6.2)",
            "threshold": f"> {THRESHOLDS['semantic_recall']:.0%}",
            "measured": f"{recall:.1%}",
            "verdict": "达标" if recall_status == "pass" else "未达标",
        }

    crisis_ms, crisis_status = last_metric("crisis_p95_ms")
    if crisis_ms is not None:
        summary["crisis_ms"] = {
            "label": "危机话术响应 P95 (FR-6.3)",
            "threshold": f"< {THRESHOLDS['crisis_ms']} ms",
            "measured": f"{crisis_ms} ms",
            "verdict": "达标" if crisis_status == "pass" else "未达标",
        }

    return summary
