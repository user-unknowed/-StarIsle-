"""
test_resilience.py - 稳定性与降级验收

所属模块：ai-engine/tests/acceptance
功能简述：
    验证知识库降级模式、参数校验、未知路由与并发请求下的服务稳定性，
    确保持续可用且错误码符合契约。
依赖关系：
    - conftest.py：client 夹具
"""
import concurrent.futures

import pytest

from tests.acceptance import reporting

pytestmark = pytest.mark.resilience


def test_knowledge_stats_fallback(client):
    """Mongo 不可用时应降级为内存模式，且知识库文档数完整（96 条）。"""
    resp = client.get("/knowledge/stats")
    assert resp.status_code == 200, resp.text
    body = resp.json()

    mode = body.get("mode", "")
    total = int(body.get("total_documents", 0))
    assert mode, "缺少知识库模式"
    assert total >= 96, f"知识库文档数异常: {total}"

    reporting.record(
        "knowledge_stats_fallback", "resilience",
        metrics={"mode": mode, "total_documents": total},
    )


def test_chat_missing_message_returns_422(client):
    """缺少必填字段应返回 422 而非 500。"""
    resp = client.post("/chat", json={"user_id": "acc_invalid"})
    assert resp.status_code == 422, resp.text
    reporting.record("chat_missing_field_422", "resilience", metrics={"status": 422})


def test_unknown_route_returns_404(client):
    """未知路由返回 404，避免被 CORS/异常处理器吞掉。"""
    resp = client.get("/no-such-endpoint")
    assert resp.status_code == 404, resp.text
    reporting.record("unknown_route_404", "resilience", metrics={"status": 404})


def test_concurrent_risk_checks(client):
    """并发 10 路风险检测应全部成功且结果一致。"""
    def check(i):
        resp = client.post("/risk/check", json={
            "user_id": f"acc_conc_{i}",
            "content": "我想自杀",
            "content_type": "chat",
        })
        return resp.status_code, resp.json().get("risk_level")

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
        results = list(pool.map(check, range(10)))

    assert all(code == 200 for code, _ in results), results
    levels = {level for _, level in results}
    assert levels == {"red"}, f"并发下风险等级不一致: {levels}"

    reporting.record(
        "concurrent_risk_checks", "resilience",
        metrics={"requests": 10, "levels": sorted(levels)},
    )
