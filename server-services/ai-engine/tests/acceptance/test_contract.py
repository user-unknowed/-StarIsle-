"""
test_contract.py - 接口契约验收

所属模块：ai-engine/tests/acceptance
功能简述：
    校验 /health、/chat、/risk/check、/emotion/analyze 的响应字段与
    关键业务语义（笑话直达、超长消息拒绝），确保前端契约稳定。
依赖关系：
    - conftest.py：client / health 夹具
"""
import time

import pytest

from tests.acceptance import reporting

pytestmark = pytest.mark.contract

RISK_LEVELS = {"green", "yellow", "orange", "red"}


def test_health_contract(client):
    """/health 需返回模型模式与推理设备，供验收环境判定。"""
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()

    assert body.get("status") == "healthy"
    assert body.get("service") == "ai-engine"
    assert body.get("model_mode") in {"local", "api"}
    assert body.get("device") in {"cpu", "cuda"}
    assert isinstance(body.get("model", ""), str)

    reporting.record(
        "health_contract", "contract",
        metrics={"model_mode": body.get("model_mode"), "device": body.get("device")},
        detail=body.get("model", ""),
    )


def test_chat_contract(client):
    """/chat 正常对话需返回完整字段（与 Java 网关/前端契约一致）。"""
    started = time.time()
    resp = client.post("/chat", json={
        "user_id": "acc_contract_1",
        "message": "今天有点累，想随便聊聊。",
    })
    elapsed_ms = int((time.time() - started) * 1000)

    assert resp.status_code == 200, resp.text
    body = resp.json()

    for field in (
        "response", "risk_level", "emotion_tags", "response_time_ms",
        "rag_enhanced", "knowledge_mode", "knowledge_hits", "model",
    ):
        assert field in body, f"缺少字段 {field}"

    assert isinstance(body["response"], str) and body["response"].strip()
    assert body["risk_level"] in RISK_LEVELS
    assert isinstance(body["emotion_tags"], list)
    assert isinstance(body["response_time_ms"], int)
    assert isinstance(body["rag_enhanced"], bool)
    assert isinstance(body["knowledge_hits"], list)
    assert isinstance(body["model"], str)

    reporting.record(
        "chat_contract", "contract",
        metrics={"client_ms": elapsed_ms, "server_ms": body["response_time_ms"]},
        detail=f"model={body['model']}, risk={body['risk_level']}",
    )


def test_chat_joke_shortcut(client):
    """"讲个笑话" 应直达笑话 RAG，不进入模型生成。"""
    started = time.time()
    resp = client.post("/chat", json={"user_id": "acc_joke", "message": "讲个笑话吧"})
    elapsed_ms = int((time.time() - started) * 1000)

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["model"] == "joke-rag"
    assert body["rag_enhanced"] is True
    assert body["knowledge_hits"], "笑话直达需返回命中的笑话标题"
    assert body["response"].strip()

    reporting.record(
        "chat_joke_shortcut", "contract",
        metrics={"client_ms": elapsed_ms, "server_ms": body["response_time_ms"]},
        detail=body["knowledge_hits"][0],
    )


def test_chat_rejects_overlong_message(client):
    """超过 2000 字的消息需被拒绝（与 Java 网关限制对齐）。"""
    resp = client.post("/chat", json={
        "user_id": "acc_long",
        "message": "啊" * 2001,
    })
    assert resp.status_code == 422, resp.text
    reporting.record("chat_overlong_rejected", "contract", metrics={"status": resp.status_code})


def test_risk_check_contract(client):
    """/risk/check 需返回风险等级、置信度与检测细节。"""
    resp = client.post("/risk/check", json={
        "user_id": "acc_risk",
        "content": "我最近压力很大，晚上总是睡不着。",
        "content_type": "chat",
    })
    assert resp.status_code == 200, resp.text
    body = resp.json()

    assert body["user_id"] == "acc_risk"
    assert body["risk_level"] in RISK_LEVELS
    assert 0 <= float(body["confidence"]) <= 1
    assert isinstance(body["details"], (dict, list))

    reporting.record(
        "risk_check_contract", "contract",
        metrics={"risk_level": body["risk_level"], "confidence": body["confidence"]},
    )


def test_emotion_analyze_contract(client):
    """/emotion/analyze 需返回情绪标签列表。"""
    resp = client.post("/emotion/analyze", json={"content": "今天考试没考好，心里很难过。"})
    assert resp.status_code == 200, resp.text
    body = resp.json()

    assert isinstance(body["emotions"], list)
    assert 0 <= float(body["confidence"]) <= 1

    reporting.record(
        "emotion_analyze_contract", "contract",
        metrics={"labels": len(body["emotions"]), "confidence": body["confidence"]},
    )
